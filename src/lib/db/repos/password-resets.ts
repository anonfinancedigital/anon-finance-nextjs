import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, like, lte, or } from "drizzle-orm";
import { RESET_TOKEN_TTL_MINUTES } from "@/lib/domain/password-reset-email";
import { account, session, user, verification } from "../auth-schema";
import { db } from "../client";
import { usersRepo } from "./users";

const PREFIX = "password-reset:";

/** Only the SHA-256 of the token is stored; the token itself exists only in the e-mail. */
const identifierOf = (token: string) => `${PREFIX}${createHash("sha256").update(token).digest("hex")}`;

/**
 * Issues a reset token for an approved account (e-mail in any case). In one transaction it deletes
 * the user's previous tokens and every expired one, then stores the new hash for 30 minutes.
 * Returns the raw token, or null when there is no approved account.
 * Expiry follows the app clock (`Date.now()`), like the login lockout.
 */
async function issue(email: string): Promise<{ token: string; email: string } | null> {
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
          or(eq(verification.value, owner.id), lte(verification.expiresAt, now)),
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

/**
 * Consumes the token and sets the new password in one transaction: deletes the token if current,
 * then, for an approved owner, replaces the credential password and ends every session.
 * `invalid` when the token is unknown, expired, already used, replaced or the owner is not approved
 * (the token is deleted anyway). Any error rolls back, and the token stays valid.
 * Of two concurrent uses, the delete lets only one find the row.
 */
async function consume(token: string, password: string): Promise<"ok" | "invalid"> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .delete(verification)
      .where(and(eq(verification.identifier, identifierOf(token)), gt(verification.expiresAt, new Date())))
      .returning({ userId: verification.value });
    if (!row) return "invalid";

    const [owner] = await tx.select({ status: user.status }).from(user).where(eq(user.id, row.userId));
    if (owner?.status !== "approved") return "invalid";

    const hash = await hashPassword(password);
    await tx
      .update(account)
      .set({ password: hash })
      .where(and(eq(account.userId, row.userId), eq(account.providerId, "credential")));
    await tx.delete(session).where(eq(session.userId, row.userId));
    return "ok";
  });
}

export const passwordResetsRepo = { issue, isValid, consume };
