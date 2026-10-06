import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { account, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import type { UserStatus } from "@/lib/domain/user-status";

export const TEST_PASSWORD = "senha-de-teste-123";

/** Inserts a user (approved unless told otherwise) with an e-mail/password credential and returns its id. */
export async function insertCredentialUser(
  email: string,
  password = TEST_PASSWORD,
  status: UserStatus = "approved",
) {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Teste", email, status });
  await db.insert(account).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: await hashPassword(password),
  });
  return id;
}

/** Signs in through Better Auth and returns the `cookie` request header value. */
export async function signInCookie(email: string, password = TEST_PASSWORD) {
  const res = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("sign-in returned no cookie");
  return setCookie.split(";")[0];
}

/**
 * Creates a credential user, signs it in and returns its id and session cookie. With a status other
 * than approved, the status is set after the sign-in: the session stays open, as when the user loses
 * access while signed in.
 */
export async function createSignedInUser(
  email = `${randomUUID()}@example.com`,
  status: UserStatus = "approved",
) {
  const userId = await insertCredentialUser(email);
  const cookie = await signInCookie(email);
  if (status !== "approved") await db.update(user).set({ status }).where(eq(user.id, userId));
  return { userId, email, cookie };
}
