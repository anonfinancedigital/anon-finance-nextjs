import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, like, lte, or } from "drizzle-orm";
import { RESET_TOKEN_TTL_MINUTES } from "@/lib/domain/password-reset-email";
import { user, verification } from "../auth-schema";
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

export const passwordResetsRepo = { issue, isValid };
