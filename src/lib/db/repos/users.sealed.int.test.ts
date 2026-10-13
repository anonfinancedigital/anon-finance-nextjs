import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import type { UserStatus } from "@/lib/domain/user-status";
import { insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { account, session, user } from "../auth-schema";
import { db, pool } from "../client";
import { signupAttempt, userVault } from "../schema";
import { usersRepo } from "./users";

setupTestDb();

const VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw-wrapped",
  dekWrappedRecovery: "v1:recovery-wrapped",
};

const input = (over: Partial<Parameters<typeof usersRepo.createSealed>[0]> = {}) => ({
  id: randomUUID(),
  name: "Ana",
  email: "Ana@Example.com",
  authSecret: "segredo-de-login-derivado",
  vault: VAULT,
  birthDateCt: "v1:nascimento",
  ipHash: null,
  ...over,
});

const counts = async () => ({
  users: (await db.select().from(user)).length,
  accounts: (await db.select().from(account)).length,
  vaults: (await db.select().from(userVault)).length,
});

describe("usersRepo.createSealed", () => {
  const sealed = (over: Partial<Parameters<typeof usersRepo.createSealed>[0]> = {}) =>
    input({ ipHash: "ip-hash-1", ...over });

  it("creates the approved user, the credential account and the vault row together", async () => {
    const data = sealed();
    expect(await usersRepo.createSealed(data)).toEqual({ ok: true });

    const [u] = await db.select().from(user).where(eq(user.id, data.id));
    expect(u).toMatchObject({ id: data.id, name: "Ana", email: "ana@example.com", status: "approved", birthDate: null });
    const [acc] = await db.select().from(account).where(eq(account.userId, data.id));
    expect(acc).toMatchObject({ providerId: "credential", accountId: data.id });
    const [vault] = await db.select().from(userVault).where(eq(userVault.userId, data.id));
    expect(vault).toMatchObject({ salt: VAULT.salt, dekWrappedPw: "v1:pw-wrapped", birthDateCt: "v1:nascimento" });
  });

  it("stores the Better Auth hash of the auth secret, never the secret itself", async () => {
    const data = sealed();
    await usersRepo.createSealed(data);
    const [acc] = await db.select().from(account).where(eq(account.userId, data.id));
    expect(acc.password).not.toContain(data.authSecret);
    expect(await verifyPassword({ hash: acc.password!, password: data.authSecret })).toBe(true);
  });

  it("creates no session", async () => {
    await usersRepo.createSealed(sealed());
    expect(await db.$count(session)).toBe(0);
  });

  it("creates the vault without birth date when none is sent", async () => {
    const data = sealed({ birthDateCt: null });
    await usersRepo.createSealed(data);
    const [vault] = await db.select().from(userVault).where(eq(userVault.userId, data.id));
    expect(vault.birthDateCt).toBeNull();
  });

  it("fails and rolls back when the id already exists", async () => {
    const first = sealed();
    await usersRepo.createSealed(first);
    const before = await counts();
    await expect(usersRepo.createSealed(sealed({ id: first.id, email: "b@example.com" }))).rejects.toThrow();
    expect(await counts()).toEqual(before);
    expect(await db.$count(signupAttempt)).toBe(1);
  });

  it("records one signup_attempt row with the IP hash", async () => {
    await usersRepo.createSealed(sealed({ ipHash: "abc123" }));
    const rows = await db.select().from(signupAttempt);
    expect(rows).toHaveLength(1);
    expect(rows[0].ipHash).toBe("abc123");
    expect(Math.abs(rows[0].attemptedAt.getTime() - Date.now())).toBeLessThan(10_000);
  });

  it("records nothing when ipHash is null", async () => {
    expect(await usersRepo.createSealed(sealed({ ipHash: null }))).toEqual({ ok: true });
    expect(await db.$count(user)).toBe(1);
    expect(await db.$count(signupAttempt)).toBe(0);
  });

  it("returns duplicate for a repeated e-mail in any case and writes no IP row", async () => {
    await usersRepo.createSealed(sealed({ ipHash: null }));
    const before = await counts();
    const again = await usersRepo.createSealed(sealed({ email: "  ANA@example.COM ", ipHash: "ip-dup" }));
    expect(again).toEqual({ ok: false, reason: "duplicate" });
    expect(await counts()).toEqual(before);
    expect(await db.$count(signupAttempt)).toBe(0);
  });

  it.each([["pending"], ["approved"], ["rejected"], ["revoked"]] as const)(
    "returns duplicate for an e-mail already used by a %s user, keeping that user, account and no vault",
    async (status: UserStatus) => {
      const id = await insertCredentialUser("ana@example.com", "outra-senha-123", status);
      const [before] = await db.select().from(user).where(eq(user.id, id));
      const [accBefore] = await db.select().from(account).where(eq(account.userId, id));

      expect(await usersRepo.createSealed(sealed({ name: "Outra", email: "ANA@example.com " }))).toEqual({
        ok: false,
        reason: "duplicate",
      });

      expect(await db.select().from(user)).toEqual([before]);
      expect(await db.select().from(account)).toEqual([accBefore]);
      expect(await db.$count(userVault)).toBe(0);
      expect(await db.$count(signupAttempt)).toBe(0);
    },
  );

  it("creates exactly one user when two signups with the same e-mail arrive together", async () => {
    const results = await Promise.all([
      usersRepo.createSealed(sealed({ email: "Ana@example.com" })),
      usersRepo.createSealed(sealed({ email: "ana@EXAMPLE.com", ipHash: "ip-2" })),
    ]);
    expect(results).toEqual(expect.arrayContaining([{ ok: true }, { ok: false, reason: "duplicate" }]));
    expect(await counts()).toEqual({ users: 1, accounts: 1, vaults: 1 });
    expect(await db.$count(signupAttempt)).toBe(1);
  });

  it("undoes the user when recording the IP fails (all or nothing)", async () => {
    await pool.query('ALTER TABLE "signup_attempt" RENAME TO "signup_attempt_off"');
    try {
      await expect(usersRepo.createSealed(sealed())).rejects.toThrow();
    } finally {
      await pool.query('ALTER TABLE "signup_attempt_off" RENAME TO "signup_attempt"');
    }
    expect(await counts()).toEqual({ users: 0, accounts: 0, vaults: 0 });
  });

  it("prunes records older than 60 minutes on a new record and keeps the recent ones", async () => {
    const MINUTE = 60_000;
    await db.insert(signupAttempt).values([
      { ipHash: "old-a", attemptedAt: new Date(Date.now() - 61 * MINUTE) },
      { ipHash: "old-b", attemptedAt: new Date(Date.now() - 120 * MINUTE) },
      { ipHash: "recent", attemptedAt: new Date(Date.now() - 59 * MINUTE) },
    ]);
    await usersRepo.createSealed(sealed({ ipHash: "new" }));
    const hashes = (await db.select().from(signupAttempt)).map((r) => r.ipHash).sort();
    expect(hashes).toEqual(["new", "recent"]);
  });

  it("does not prune when ipHash is null", async () => {
    await db.insert(signupAttempt).values({ ipHash: "old", attemptedAt: new Date(Date.now() - 120 * 60_000) });
    await usersRepo.createSealed(sealed({ ipHash: null }));
    expect(await db.$count(signupAttempt)).toBe(1);
  });
});
