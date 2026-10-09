import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import type { UserStatus } from "@/lib/domain/user-status";
import { insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { account, session, user } from "../auth-schema";
import { db } from "../client";
import { userVault } from "../schema";
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

const input = (over: Partial<Parameters<typeof usersRepo.createPendingSealed>[0]> = {}) => ({
  id: randomUUID(),
  name: "Ana",
  email: "Ana@Example.com",
  authSecret: "segredo-de-login-derivado",
  vault: VAULT,
  birthDateCt: "v1:nascimento",
  ...over,
});

const counts = async () => ({
  users: (await db.select().from(user)).length,
  accounts: (await db.select().from(account)).length,
  vaults: (await db.select().from(userVault)).length,
});

describe("usersRepo.createPendingSealed", () => {
  it("creates the pending user, the credential account and the vault row together", async () => {
    const data = input();
    expect(await usersRepo.createPendingSealed(data)).toEqual({ ok: true });

    const [u] = await db.select().from(user).where(eq(user.id, data.id));
    expect(u).toMatchObject({ id: data.id, name: "Ana", email: "ana@example.com", status: "pending", birthDate: null });
    const [acc] = await db.select().from(account).where(eq(account.userId, data.id));
    expect(acc).toMatchObject({ providerId: "credential", accountId: data.id });
    const [vault] = await db.select().from(userVault).where(eq(userVault.userId, data.id));
    expect(vault).toMatchObject({
      salt: VAULT.salt,
      memKib: 65536,
      iterations: 3,
      parallelism: 1,
      dekWrappedPw: "v1:pw-wrapped",
      dekWrappedRecovery: "v1:recovery-wrapped",
      birthDateCt: "v1:nascimento",
    });
  });

  it("stores the Better Auth hash of the auth secret, never the secret itself", async () => {
    const data = input();
    await usersRepo.createPendingSealed(data);

    const [acc] = await db.select().from(account).where(eq(account.userId, data.id));
    expect(acc.password).not.toBe(data.authSecret);
    expect(acc.password).not.toContain(data.authSecret);
    expect(await verifyPassword({ hash: acc.password!, password: data.authSecret })).toBe(true);
    expect(await verifyPassword({ hash: acc.password!, password: "outro" })).toBe(false);
  });

  it("returns duplicate for a repeated e-mail in any case and writes nothing", async () => {
    await usersRepo.createPendingSealed(input());
    const before = await counts();

    const again = await usersRepo.createPendingSealed(input({ email: "  ANA@example.COM " }));
    expect(again).toEqual({ ok: false, reason: "duplicate" });
    expect(await counts()).toEqual(before);
  });

  it("fails and rolls back when the id already exists", async () => {
    const first = input();
    await usersRepo.createPendingSealed(first);
    const before = await counts();

    await expect(usersRepo.createPendingSealed(input({ id: first.id, email: "b@example.com" }))).rejects.toThrow();
    expect(await counts()).toEqual(before);
    expect(await db.select().from(user).where(eq(user.email, "b@example.com"))).toHaveLength(0);
  });

  it("creates the vault without birth date when none is sent", async () => {
    const data = input({ birthDateCt: null });
    await usersRepo.createPendingSealed(data);
    const [vault] = await db.select().from(userVault).where(eq(userVault.userId, data.id));
    expect(vault.birthDateCt).toBeNull();
  });

  it("creates no session", async () => {
    await usersRepo.createPendingSealed(input());
    expect(await db.$count(session)).toBe(0);
  });

  it.each([["pending"], ["approved"], ["rejected"], ["revoked"]] as const)(
    "returns duplicate for an e-mail already used by a %s user, keeping that user, account and no vault",
    async (status: UserStatus) => {
      const id = await insertCredentialUser("ana@example.com", "outra-senha-123", status);
      const [before] = await db.select().from(user).where(eq(user.id, id));
      const [accBefore] = await db.select().from(account).where(eq(account.userId, id));

      expect(await usersRepo.createPendingSealed(input({ name: "Outra", email: "ANA@example.com " }))).toEqual({
        ok: false,
        reason: "duplicate",
      });

      expect(await db.select().from(user)).toEqual([before]);
      expect(await db.select().from(account)).toEqual([accBefore]);
      expect(await db.$count(userVault)).toBe(0);
    },
  );

  it("creates exactly one user when two signups with the same e-mail arrive together", async () => {
    const results = await Promise.all([
      usersRepo.createPendingSealed(input({ email: "Ana@example.com" })),
      usersRepo.createPendingSealed(input({ email: "ana@EXAMPLE.com" })),
    ]);

    expect(results).toEqual(expect.arrayContaining([{ ok: true }, { ok: false, reason: "duplicate" }]));
    expect(await counts()).toEqual({ users: 1, accounts: 1, vaults: 1 });
  });
});
