import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { createSignedInUser, insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { auth } from "./auth";

setupTestDb();

const EMAIL = "ana@x.com";

const sessionsOf = (userId: string) => db.$count(session, eq(session.userId, userId));

describe("session creation through the Better Auth endpoint", () => {
  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "refuses a %s user with the right password and creates no session",
    async (status) => {
      const userId = await insertCredentialUser(EMAIL, TEST_PASSWORD, status);

      const attempt = auth.api.signInEmail({ body: { email: EMAIL, password: TEST_PASSWORD } });

      await expect(attempt).rejects.toBeInstanceOf(APIError);
      expect(await sessionsOf(userId)).toBe(0);
    },
  );

  it("creates the session of an approved user", async () => {
    const userId = await insertCredentialUser(EMAIL, TEST_PASSWORD, "approved");

    const result = await auth.api.signInEmail({ body: { email: EMAIL, password: TEST_PASSWORD } });

    expect(result.user.id).toBe(userId);
    expect(await sessionsOf(userId)).toBe(1);
  });
});

describe("getSession", () => {
  it("returns the status of an approved user", async () => {
    const { cookie } = await createSignedInUser(EMAIL);

    const result = await auth.api.getSession({ headers: new Headers({ cookie }) });

    expect(result?.user.status).toBe("approved");
  });

  it("returns the current status of a user who lost access while signed in", async () => {
    const { cookie } = await createSignedInUser(EMAIL, "revoked");

    const result = await auth.api.getSession({ headers: new Headers({ cookie }) });

    expect(result?.user.status).toBe("revoked");
  });
});

describe("signUpEmail", () => {
  it("stays disabled: the endpoint fails and creates no user", async () => {
    const attempt = auth.api.signUpEmail({
      body: { name: "Ana", email: EMAIL, password: TEST_PASSWORD },
    });

    await expect(attempt).rejects.toBeInstanceOf(APIError);
    expect(await db.$count(user)).toBe(0);
  });
});
