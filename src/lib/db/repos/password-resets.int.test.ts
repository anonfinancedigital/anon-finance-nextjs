import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { user, verification } from "../auth-schema";
import { db } from "../client";
import { passwordResetsRepo } from "./password-resets";

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
