import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { account, user } from "./auth-schema";
import { db } from "./client";

/**
 * Creates the single account, or resets its password when the e-mail already exists.
 * The password is stored only as Better Auth's salted hash.
 */
export async function seedUser(email: string, password: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const hash = await hashPassword(password);

  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, normalized));
    const userId = existing?.id ?? randomUUID();

    if (existing) {
      await tx
        .delete(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    } else {
      await tx.insert(user).values({ id: userId, name: "Administrador", email: normalized });
    }
    await tx.insert(account).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hash,
    });
    return userId;
  });
}

/** Seeds the account from ADMIN_EMAIL and ADMIN_PASSWORD. */
export async function seedAdminFromEnv(): Promise<string> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }
  return seedUser(ADMIN_EMAIL, ADMIN_PASSWORD);
}
