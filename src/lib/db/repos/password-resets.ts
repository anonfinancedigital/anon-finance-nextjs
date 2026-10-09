import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, like, lte, or } from "drizzle-orm";
import { RESET_TOKEN_TTL_MINUTES } from "@/lib/domain/password-reset-email";
import { account, session, user, verification } from "../auth-schema";
import { db } from "../client";
import { userVault } from "../schema";
import type { VaultMaterial } from "@/lib/vault/types";
import { usersRepo } from "./users";
import { type KdfParamValues, vaultRepo } from "./vault";

const PREFIX = "password-reset:";

/** Only the SHA-256 of the token is stored; the token itself exists only in the e-mail. */
const identifierOf = (token: string) =>
  `${PREFIX}${createHash("sha256").update(token).digest("hex")}`;

/**
 * Issues a reset token for an approved account (e-mail in any case). In one transaction it deletes
 * the user's previous tokens and every expired one, then stores the new hash for 30 minutes.
 * Returns the raw token, or null when there is no approved account.
 * Expiry follows the app clock (`Date.now()`), like the login lockout.
 */
async function issue(
  email: string,
): Promise<{ token: string; email: string } | null> {
  const owner = await usersRepo.findByEmail(email);
  if (!owner || owner.status !== "approved") return null;

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .delete(verification)
      .where(
        and(
          like(verification.identifier, `${PREFIX}%`),
          or(
            eq(verification.value, owner.id),
            lte(verification.expiresAt, now),
          ),
        ),
      );
    await tx.insert(verification).values({
      id: randomUUID(),
      identifier: identifierOf(token),
      value: owner.id,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000),
    });
  });
  return { token, email: owner.email };
}

/** The token exists, has not expired and its owner is approved. Does not consume it. */
async function isValid(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await db
    .select({ id: verification.id })
    .from(verification)
    .innerJoin(user, eq(user.id, verification.value))
    .where(
      and(
        eq(verification.identifier, identifierOf(token)),
        gt(verification.expiresAt, new Date()),
        eq(user.status, "approved"),
      ),
    );
  return rows.length > 0;
}

/** Thrown inside the transaction to undo it without raising an error to the caller. */
class Rollback extends Error {}

/**
 * Consumes the token and sets the new password in one transaction (legacy accounts only): deletes
 * the token if current, then, for an approved owner, replaces the credential password and ends every
 * session. `invalid` when the token is unknown, expired, already used, replaced or the owner is not
 * approved (the token is deleted anyway), or the owner has a vault: that account signs in with the
 * `authSecret`, so a real password must never replace its hash (rolls back, the token stays valid
 * for `consumeSealed`). Any error rolls back, and the token stays valid.
 * Of two concurrent uses, the delete lets only one find the row.
 */
async function consume(
  token: string,
  password: string,
): Promise<"ok" | "invalid"> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(verification)
        .where(
          and(
            eq(verification.identifier, identifierOf(token)),
            gt(verification.expiresAt, new Date()),
          ),
        )
        .returning({ userId: verification.value });
      if (!row) return "invalid";

      const [owner] = await tx
        .select({ status: user.status, hasVault: userVault.userId })
        .from(user)
        .leftJoin(userVault, eq(userVault.userId, user.id))
        .where(eq(user.id, row.userId));
      if (owner?.status !== "approved") return "invalid";
      if (owner.hasVault) throw new Rollback();

      const hash = await hashPassword(password);
      await tx
        .update(account)
        .set({ password: hash })
        .where(
          and(
            eq(account.userId, row.userId),
            eq(account.providerId, "credential"),
          ),
        );
      await tx.delete(session).where(eq(session.userId, row.userId));
      return "ok";
    });
  } catch (error) {
    if (error instanceof Rollback) return "invalid";
    throw error;
  }
}

/**
 * The token's owner and their recovery-wrapped DEK, for the browser to unwrap with the recovery key
 * (the owner id is part of the wrap's AAD). `dekWrappedRecovery` is `null` when the owner has no
 * vault yet (legacy account, reset with `consume`). `null` when the token is unknown, expired or
 * used, or the owner is not approved. Does not consume the token.
 */
async function recoveryMaterialFor(
  token: string,
): Promise<{ userId: string; dekWrappedRecovery: string | null } | null> {
  if (!token) return null;
  const [row] = await db
    .select({
      userId: user.id,
      dekWrappedRecovery: userVault.dekWrappedRecovery,
    })
    .from(verification)
    .innerJoin(user, eq(user.id, verification.value))
    .leftJoin(userVault, eq(userVault.userId, user.id))
    .where(
      and(
        eq(verification.identifier, identifierOf(token)),
        gt(verification.expiresAt, new Date()),
        eq(user.status, "approved"),
      ),
    );
  return row ?? null;
}

/** What the browser sends to finish a reset of a sealed account. */
export type SealedResetInput =
  | {
      /** The user has the recovery key: same DEK, new password. */
      mode: "rewrap";
      authSecret: string;
      salt: string;
      params: KdfParamValues;
      dekWrappedPw: string;
    }
  | {
      /** The user lost the recovery key: financial data is erased and a whole new vault is stored. */
      mode: "wipe";
      authSecret: string;
      vault: VaultMaterial;
    };

/**
 * `consume` for a sealed account, in one transaction: deletes the token if current, then for an
 * approved owner with a vault replaces the credential hash with `hashPassword(authSecret)` and ends
 * every session. `rewrap` also rewraps the DEK with the new KEK (financial data untouched); `wipe`
 * erases transactions, categories, goal and the plain birth date, deletes the old `user_vault` row
 * and creates the new one (delete + insert, so the sealed birth date and every key column start
 * fresh). `invalid` when the token is unknown, expired or used, the owner is not approved, or the
 * user has no vault (the last two roll back and leave the token valid, unlike `consume`).
 * Any error rolls back, and the token stays valid.
 */
async function consumeSealed(
  token: string,
  input: SealedResetInput,
): Promise<"ok" | "invalid"> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(verification)
        .where(
          and(
            eq(verification.identifier, identifierOf(token)),
            gt(verification.expiresAt, new Date()),
          ),
        )
        .returning({ userId: verification.value });
      if (!row) return "invalid";

      const [owner] = await tx
        .select({ status: user.status, hasVault: userVault.userId })
        .from(user)
        .leftJoin(userVault, eq(userVault.userId, user.id))
        .where(eq(user.id, row.userId));
      if (owner?.status !== "approved" || !owner.hasVault) throw new Rollback();

      const hash = await hashPassword(input.authSecret);
      if (input.mode === "rewrap") {
        await vaultRepo.rewrap(tx, row.userId, {
          salt: input.salt,
          params: input.params,
          dekWrappedPw: input.dekWrappedPw,
        });
      } else {
        await vaultRepo.wipeFinancialData(tx, row.userId);
        await tx
          .update(user)
          .set({ birthDate: null })
          .where(eq(user.id, row.userId));
        await tx.delete(userVault).where(eq(userVault.userId, row.userId));
        await vaultRepo.create(tx, row.userId, input.vault);
      }
      await tx
        .update(account)
        .set({ password: hash })
        .where(
          and(
            eq(account.userId, row.userId),
            eq(account.providerId, "credential"),
          ),
        );
      await tx.delete(session).where(eq(session.userId, row.userId));
      return "ok";
    });
  } catch (error) {
    if (error instanceof Rollback) return "invalid";
    throw error;
  }
}

export const passwordResetsRepo = {
  issue,
  isValid,
  consume,
  recoveryMaterialFor,
  consumeSealed,
};
