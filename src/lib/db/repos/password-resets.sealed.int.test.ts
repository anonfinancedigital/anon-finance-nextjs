import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import { createSignedInUser, insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { account, session, user, verification } from "../auth-schema";
import { db } from "../client";
import { category, financialGoal, transaction, userVault } from "../schema";
import { passwordResetsRepo } from "./password-resets";
import { vaultRepo } from "./vault";

// Real hashing, wrapped so a test can force one call to fail.
vi.mock("better-auth/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/crypto")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});

setupTestDb();

afterEach(() => {
  vi.useRealTimers();
});

const OLD_VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:old-pw",
  dekWrappedRecovery: "v1:old-recovery",
};
const NEW_VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "BBBBBBBBBBBBBBBBBBBBBB",
  memKib: 32768,
  iterations: 2,
  parallelism: 2,
  dekWrappedPw: "v1:new-pw",
  dekWrappedRecovery: "v1:new-recovery",
};

/** A signed-in sealed account with one row of each financial table and a password-reset token. */
async function sealedAccount(email = "ana@x.com") {
  const { userId } = await createSignedInUser(email);
  await db.transaction((tx) => vaultRepo.create(tx, userId, OLD_VAULT));
  await vaultRepo.setBirthDateSealed(userId, "v1:birth");
  const [cat] = await db.insert(category).values({ userId, nameCt: "v1:cat", color: 1 }).returning();
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "expense",
    categoryId: cat.id,
    date: "2026-10-01",
    amountCt: "v1:amount",
  });
  await db.insert(financialGoal).values({
    userId,
    annualRateBp: null,
    monthlyIncomeCt: "v1:a",
    savedCt: "v1:b",
    retirementAgeCt: "v1:c",
    annualRateCt: "v1:d",
    withdrawalRateCt: "v1:e",
  });
  const issued = await passwordResetsRepo.issue(email);
  return { userId, token: issued!.token };
}

const REWRAP = {
  mode: "rewrap",
  authSecret: "novo-segredo",
  salt: NEW_VAULT.salt,
  params: { memKib: 32768, iterations: 2, parallelism: 2 },
  dekWrappedPw: "v1:rewrapped-pw",
} as const;
const WIPE = { mode: "wipe", authSecret: "novo-segredo", vault: NEW_VAULT } as const;

const hashOf = async (userId: string) =>
  (await db.select().from(account).where(eq(account.userId, userId)))[0].password!;
const vaultOf = async (userId: string) =>
  (await db.select().from(userVault).where(eq(userVault.userId, userId)))[0];
const dataCounts = async (userId: string) => ({
  transactions: (await db.select().from(transaction).where(eq(transaction.userId, userId))).length,
  categories: (await db.select().from(category).where(eq(category.userId, userId))).length,
  goals: (await db.select().from(financialGoal).where(eq(financialGoal.userId, userId))).length,
});
const sessionsOf = async (userId: string) =>
  (await db.select().from(session).where(eq(session.userId, userId))).length;

describe("passwordResetsRepo.recoveryMaterialFor", () => {
  it("returns the recovery-wrapped DEK for a valid token without consuming it", async () => {
    const { token } = await sealedAccount();
    expect(await passwordResetsRepo.recoveryMaterialFor(token)).toBe("v1:old-recovery");
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });

  it("returns null for an unknown, empty or expired token", async () => {
    const { token } = await sealedAccount();
    expect(await passwordResetsRepo.recoveryMaterialFor("desconhecido")).toBeNull();
    expect(await passwordResetsRepo.recoveryMaterialFor("")).toBeNull();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect(await passwordResetsRepo.recoveryMaterialFor(token)).toBeNull();
  });

  it("returns null when the owner has no vault (legacy account)", async () => {
    await insertCredentialUser("velho@x.com");
    const issued = await passwordResetsRepo.issue("velho@x.com");
    expect(await passwordResetsRepo.recoveryMaterialFor(issued!.token)).toBeNull();
  });
});

describe("passwordResetsRepo.consumeSealed rewrap", () => {
  it("swaps hash and dekWrappedPw, consumes the token, ends sessions and keeps financial data", async () => {
    const { userId, token } = await sealedAccount();
    const before = await dataCounts(userId);

    expect(await passwordResetsRepo.consumeSealed(token, REWRAP)).toBe("ok");

    expect(await verifyPassword({ hash: await hashOf(userId), password: "novo-segredo" })).toBe(true);
    expect(await verifyPassword({ hash: await hashOf(userId), password: TEST_PASSWORD })).toBe(false);
    expect(await vaultOf(userId)).toMatchObject({
      salt: NEW_VAULT.salt,
      memKib: 32768,
      iterations: 2,
      parallelism: 2,
      dekWrappedPw: "v1:rewrapped-pw",
      dekWrappedRecovery: "v1:old-recovery",
      birthDateCt: "v1:birth",
    });
    expect(await db.select().from(verification)).toHaveLength(0);
    expect(await sessionsOf(userId)).toBe(0);
    expect(await dataCounts(userId)).toEqual(before);
    expect(before).toEqual({ transactions: 1, categories: 1, goals: 1 });
  });

  it("rolls back everything when hashing fails, leaving the token valid", async () => {
    const { userId, token } = await sealedAccount();
    const hash = await hashOf(userId);
    vi.mocked(hashPassword).mockRejectedValueOnce(new Error("hash falhou"));

    await expect(passwordResetsRepo.consumeSealed(token, REWRAP)).rejects.toThrow("hash falhou");

    expect(await hashOf(userId)).toBe(hash);
    expect(await vaultOf(userId)).toMatchObject({ dekWrappedPw: "v1:old-pw" });
    expect(await sessionsOf(userId)).toBe(1);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });
});

describe("passwordResetsRepo.consumeSealed wipe", () => {
  it("erases the financial data, replaces the whole vault and the hash, and ends sessions", async () => {
    const { userId, token } = await sealedAccount();

    expect(await passwordResetsRepo.consumeSealed(token, WIPE)).toBe("ok");

    expect(await dataCounts(userId)).toEqual({ transactions: 0, categories: 0, goals: 0 });
    expect(await vaultOf(userId)).toMatchObject({
      salt: NEW_VAULT.salt,
      memKib: 32768,
      iterations: 2,
      parallelism: 2,
      dekWrappedPw: "v1:new-pw",
      dekWrappedRecovery: "v1:new-recovery",
      birthDateCt: null,
    });
    expect(await db.select().from(userVault).where(eq(userVault.userId, userId))).toHaveLength(1);
    expect(await verifyPassword({ hash: await hashOf(userId), password: "novo-segredo" })).toBe(true);
    expect(await sessionsOf(userId)).toBe(0);
    expect(await passwordResetsRepo.isValid(token)).toBe(false);
  });

  it("rolls back the erase when the new vault is rejected, leaving the token valid", async () => {
    const { userId, token } = await sealedAccount();
    const hash = await hashOf(userId);

    await expect(
      passwordResetsRepo.consumeSealed(token, {
        ...WIPE,
        vault: { ...NEW_VAULT, kdfVersion: 2 as unknown as 1 },
      }),
    ).rejects.toThrow();

    expect(await dataCounts(userId)).toEqual({ transactions: 1, categories: 1, goals: 1 });
    expect(await vaultOf(userId)).toMatchObject({ dekWrappedPw: "v1:old-pw", birthDateCt: "v1:birth" });
    expect(await hashOf(userId)).toBe(hash);
    expect(await sessionsOf(userId)).toBe(1);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });
});

describe("passwordResetsRepo.consumeSealed invalid tokens", () => {
  it("returns invalid for an unknown token and changes nothing", async () => {
    const { userId, token } = await sealedAccount();
    const hash = await hashOf(userId);

    expect(await passwordResetsRepo.consumeSealed("desconhecido", WIPE)).toBe("invalid");

    expect(await hashOf(userId)).toBe(hash);
    expect(await dataCounts(userId)).toEqual({ transactions: 1, categories: 1, goals: 1 });
    expect(await vaultOf(userId)).toMatchObject({ dekWrappedPw: "v1:old-pw" });
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });

  it("returns invalid for an expired token and for a token already used", async () => {
    const { userId, token } = await sealedAccount();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect(await passwordResetsRepo.consumeSealed(token, REWRAP)).toBe("invalid");
    vi.useRealTimers();
    expect(await vaultOf(userId)).toMatchObject({ dekWrappedPw: "v1:old-pw" });

    const second = await passwordResetsRepo.issue("ana@x.com");
    expect(await passwordResetsRepo.consumeSealed(second!.token, REWRAP)).toBe("ok");
    expect(await passwordResetsRepo.consumeSealed(second!.token, WIPE)).toBe("invalid");
    expect(await dataCounts(userId)).toEqual({ transactions: 1, categories: 1, goals: 1 });
  });

  it("returns invalid and keeps the token when the owner has no vault", async () => {
    const id = await insertCredentialUser("velho@x.com");
    const issued = await passwordResetsRepo.issue("velho@x.com");
    const hash = await hashOf(id);

    expect(await passwordResetsRepo.consumeSealed(issued!.token, REWRAP)).toBe("invalid");

    expect(await hashOf(id)).toBe(hash);
    expect(await db.select().from(userVault)).toHaveLength(0);
    expect(await passwordResetsRepo.isValid(issued!.token)).toBe(true);
  });

  it("returns invalid when the owner is no longer approved", async () => {
    const { userId, token } = await sealedAccount();
    await db.update(user).set({ status: "revoked" }).where(eq(user.id, userId));

    expect(await passwordResetsRepo.consumeSealed(token, WIPE)).toBe("invalid");
    expect(await dataCounts(userId)).toEqual({ transactions: 1, categories: 1, goals: 1 });
  });
});
