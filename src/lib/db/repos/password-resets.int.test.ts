import { createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { createSignedInUser, insertCredentialUser, signInCookie, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { account, session, user, verification } from "../auth-schema";
import { db } from "../client";
import { passwordResetsRepo } from "./password-resets";

// Real hashing, wrapped so a test can force one call to fail.
vi.mock("better-auth/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/crypto")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});

setupTestDb();

const MINUTE = 60_000;
const NOT_APPROVED = [["pending"], ["rejected"], ["revoked"]] as const;

const identifierOf = (token: string) => `password-reset:${createHash("sha256").update(token).digest("hex")}`;
const rowsOf = (userId: string) => db.select().from(verification).where(eq(verification.value, userId));

/** Freezes the app clock (Date only; timers stay real for the DB driver). */
function freezeClock(at = new Date("2026-10-07T12:00:00.000Z")) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
  return at;
}

const advanceClock = (ms: number) => vi.setSystemTime(Date.now() + ms);

afterEach(() => {
  vi.useRealTimers();
});

describe("passwordResetsRepo.issue", () => {
  it("returns a token for an approved account and stores only its hash, valid for 30 minutes", async () => {
    const now = freezeClock();
    const id = await insertCredentialUser("ana@x.com");

    const issued = await passwordResetsRepo.issue("ana@x.com");

    expect(issued).toEqual({ token: expect.any(String), email: "ana@x.com" });
    const rows = await db.select().from(verification);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      identifier: identifierOf(issued!.token),
      value: id,
      expiresAt: new Date(now.getTime() + 30 * MINUTE),
    });
    expect(JSON.stringify(rows)).not.toContain(issued!.token);
  });

  it("finds the account by an e-mail in upper case with spaces at the ends", async () => {
    const id = await insertCredentialUser("ana@x.com");

    const issued = await passwordResetsRepo.issue("  ANA@X.Com ");

    expect(issued).toEqual({ token: expect.any(String), email: "ana@x.com" });
    expect(await rowsOf(id)).toHaveLength(1);
  });

  it("returns null and stores nothing for an e-mail without account", async () => {
    await insertCredentialUser("ana@x.com");

    expect(await passwordResetsRepo.issue("bia@x.com")).toBeNull();
    expect(await db.$count(verification)).toBe(0);
  });

  it.each(NOT_APPROVED)("returns null and stores nothing for a %s account", async (status) => {
    await insertCredentialUser("ana@x.com", undefined, status);

    expect(await passwordResetsRepo.issue("ana@x.com")).toBeNull();
    expect(await db.$count(verification)).toBe(0);
  });

  it("invalidates the previous token of the same user and keeps the tokens of other users", async () => {
    const ana = await insertCredentialUser("ana@x.com");
    await insertCredentialUser("bia@x.com");
    const bia1 = await passwordResetsRepo.issue("bia@x.com");
    const ana1 = await passwordResetsRepo.issue("ana@x.com");

    const ana2 = await passwordResetsRepo.issue("ana@x.com");

    expect(ana2!.token).not.toBe(ana1!.token);
    expect(await passwordResetsRepo.isValid(ana1!.token)).toBe(false);
    expect(await passwordResetsRepo.isValid(ana2!.token)).toBe(true);
    expect(await passwordResetsRepo.isValid(bia1!.token)).toBe(true);
    expect(await rowsOf(ana)).toEqual([expect.objectContaining({ identifier: identifierOf(ana2!.token) })]);
  });

  it("deletes the expired tokens of any user", async () => {
    freezeClock();
    const ana = await insertCredentialUser("ana@x.com");
    const bia = await insertCredentialUser("bia@x.com");
    await passwordResetsRepo.issue("ana@x.com");
    advanceClock(31 * MINUTE);

    await passwordResetsRepo.issue("bia@x.com");

    expect(await rowsOf(ana)).toEqual([]);
    expect(await rowsOf(bia)).toHaveLength(1);
  });
});

describe("passwordResetsRepo.isValid", () => {
  it("is true for a current token of an approved account", async () => {
    await insertCredentialUser("ana@x.com");
    const issued = await passwordResetsRepo.issue("ana@x.com");

    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(true);
  });

  it("does not consume the token", async () => {
    await insertCredentialUser("ana@x.com");
    const issued = await passwordResetsRepo.issue("ana@x.com");

    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(true);
    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(true);
    expect(await db.$count(verification)).toBe(1);
  });

  it("is false for an unknown token", async () => {
    await insertCredentialUser("ana@x.com");
    await passwordResetsRepo.issue("ana@x.com");

    expect(await passwordResetsRepo.isValid("token-desconhecido")).toBe(false);
  });

  it("is false for an empty string", async () => {
    await insertCredentialUser("ana@x.com");
    await passwordResetsRepo.issue("ana@x.com");

    expect(await passwordResetsRepo.isValid("")).toBe(false);
  });

  it("is true just before 30 minutes and false at 30 minutes after the request", async () => {
    freezeClock();
    await insertCredentialUser("ana@x.com");
    const issued = await passwordResetsRepo.issue("ana@x.com");

    advanceClock(30 * MINUTE - 1);
    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(true);
    advanceClock(1);
    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(false);
  });

  it.each(NOT_APPROVED)("is false when the owner became %s after the request", async (status) => {
    const id = await insertCredentialUser("ana@x.com");
    const issued = await passwordResetsRepo.issue("ana@x.com");
    await db.update(user).set({ status }).where(eq(user.id, id));

    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(false);
  });

  it("is false when the owner was deleted", async () => {
    const id = await insertCredentialUser("ana@x.com");
    const issued = await passwordResetsRepo.issue("ana@x.com");
    await db.delete(user).where(eq(user.id, id));

    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(false);
  });
});

describe("passwordResetsRepo.consume", () => {
  const NEW_PASSWORD = "nova-senha-456";

  const sessionsOf = (userId: string) => db.$count(session, eq(session.userId, userId));
  const accounts = () => db.select().from(account).orderBy(asc(account.id));

  /** Whether Better Auth signs the e-mail in with the password. */
  async function signsIn(email: string, password: string) {
    try {
      await auth.api.signInEmail({ body: { email, password } });
      return true;
    } catch {
      return false;
    }
  }

  it("returns ok and replaces the password: the new one signs in and the old one does not", async () => {
    await insertCredentialUser("ana@x.com");
    const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;

    expect(await passwordResetsRepo.consume(token, NEW_PASSWORD)).toBe("ok");

    expect(await signsIn("ana@x.com", TEST_PASSWORD)).toBe(false);
    expect(await signsIn("ana@x.com", NEW_PASSWORD)).toBe(true);
  });

  it("deletes every session of the user, keeps the sessions of other users and opens none", async () => {
    const { userId, email } = await createSignedInUser("ana@x.com");
    await signInCookie(email);
    const other = await createSignedInUser("bia@x.com");
    expect(await sessionsOf(userId)).toBe(2);
    const { token } = (await passwordResetsRepo.issue(email))!;

    expect(await passwordResetsRepo.consume(token, NEW_PASSWORD)).toBe("ok");

    expect(await sessionsOf(userId)).toBe(0);
    expect(await sessionsOf(other.userId)).toBe(1);
  });

  it("consumes the token: a second use is invalid and keeps the first new password", async () => {
    await insertCredentialUser("ana@x.com");
    const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;
    await passwordResetsRepo.consume(token, NEW_PASSWORD);

    expect(await passwordResetsRepo.consume(token, "outra-senha-789")).toBe("invalid");

    expect(await db.$count(verification)).toBe(0);
    expect(await signsIn("ana@x.com", "outra-senha-789")).toBe(false);
    expect(await signsIn("ana@x.com", NEW_PASSWORD)).toBe(true);
  });

  it("returns invalid for an unknown token without changing any password", async () => {
    await insertCredentialUser("ana@x.com");
    await passwordResetsRepo.issue("ana@x.com");
    const before = await accounts();

    expect(await passwordResetsRepo.consume("token-desconhecido", NEW_PASSWORD)).toBe("invalid");

    expect(await accounts()).toEqual(before);
  });

  it("returns invalid for an expired token without changing any password", async () => {
    freezeClock();
    await insertCredentialUser("ana@x.com");
    const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;
    const before = await accounts();
    advanceClock(30 * MINUTE);

    expect(await passwordResetsRepo.consume(token, NEW_PASSWORD)).toBe("invalid");

    expect(await accounts()).toEqual(before);
  });

  it("returns invalid for a token replaced by a newer request without changing any password", async () => {
    await insertCredentialUser("ana@x.com");
    const older = (await passwordResetsRepo.issue("ana@x.com"))!;
    const newer = (await passwordResetsRepo.issue("ana@x.com"))!;
    const before = await accounts();

    expect(await passwordResetsRepo.consume(older.token, NEW_PASSWORD)).toBe("invalid");

    expect(await accounts()).toEqual(before);
    expect(await passwordResetsRepo.isValid(newer.token)).toBe(true);
  });

  it("returns invalid for a token of a deleted user without changing any password", async () => {
    const id = await insertCredentialUser("ana@x.com");
    await insertCredentialUser("bia@x.com");
    const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;
    await db.delete(user).where(eq(user.id, id));
    const before = await accounts();

    expect(await passwordResetsRepo.consume(token, NEW_PASSWORD)).toBe("invalid");

    expect(await accounts()).toEqual(before);
  });

  it.each(NOT_APPROVED)(
    "returns invalid when the owner became %s, keeping the password and deleting the token",
    async (status) => {
      const id = await insertCredentialUser("ana@x.com");
      const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;
      await db.update(user).set({ status }).where(eq(user.id, id));
      const before = await accounts();

      expect(await passwordResetsRepo.consume(token, NEW_PASSWORD)).toBe("invalid");

      expect(await accounts()).toEqual(before);
      expect(await db.$count(verification)).toBe(0);
    },
  );

  it("accepts exactly one of two simultaneous uses of the same token", async () => {
    await insertCredentialUser("ana@x.com");
    const { token } = (await passwordResetsRepo.issue("ana@x.com"))!;

    const results = await Promise.all([
      passwordResetsRepo.consume(token, "primeira-senha-1"),
      passwordResetsRepo.consume(token, "segunda-senha-2"),
    ]);

    expect([...results].sort()).toEqual(["invalid", "ok"]);
    const winner = results[0] === "ok" ? "primeira-senha-1" : "segunda-senha-2";
    const loser = results[0] === "ok" ? "segunda-senha-2" : "primeira-senha-1";
    expect(await signsIn("ana@x.com", loser)).toBe(false);
    expect(await signsIn("ana@x.com", winner)).toBe(true);
  });

  it("rolls everything back when hashing fails after the token is deleted", async () => {
    const { userId, email } = await createSignedInUser("ana@x.com");
    const { token } = (await passwordResetsRepo.issue(email))!;
    const before = await accounts();
    vi.mocked(hashPassword).mockRejectedValueOnce(new Error("hash falhou"));

    await expect(passwordResetsRepo.consume(token, NEW_PASSWORD)).rejects.toThrow("hash falhou");

    expect(await accounts()).toEqual(before);
    expect(await sessionsOf(userId)).toBe(1);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
    expect(await signsIn(email, TEST_PASSWORD)).toBe(true);
  });
});
