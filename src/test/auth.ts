import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { account, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";

export const TEST_PASSWORD = "senha-de-teste-123";

/** Inserts a user with an e-mail/password credential and returns its id. */
export async function insertCredentialUser(email: string, password = TEST_PASSWORD) {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Teste", email });
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

/** Creates a credential user, signs it in and returns its id and session cookie. */
export async function createSignedInUser(email = `${randomUUID()}@example.com`) {
  const userId = await insertCredentialUser(email);
  return { userId, email, cookie: await signInCookie(email) };
}
