import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import type { VaultMaterial } from "@/lib/vault/types";
import { user } from "../auth-schema";
import { db } from "../client";
import {
  category,
  categoryPercent,
  financialGoal,
  subcategory,
  transaction,
  userVault,
} from "../schema";
import { vaultRepo } from "./vault";

setupTestDb();

const UNIQUE_VIOLATION = "23505";

const MATERIAL: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw-wrapped",
  dekWrappedRecovery: "v1:recovery-wrapped",
};

const createVault = (userId: string, material: VaultMaterial = MATERIAL) =>
  db.transaction((tx) => vaultRepo.create(tx, userId, material));

/** Sealed financial data (every sensitive column holds a `v1:` value) plus a sealed birth date. */
async function seedSealedData(userId: string) {
  await createVault(userId);
  await db.update(userVault).set({ birthDateCt: "v1:birth" }).where(eq(userVault.userId, userId));
  const [cat] = await db.insert(category).values({ userId, nameCt: "v1:cat", color: 1 }).returning();
  await db.insert(categoryPercent).values({ categoryId: cat.id, fromMonth: "0001-01-01", percentCt: "v1:pct" });
  const [sub] = await db
    .insert(subcategory)
    .values({ userId, categoryId: cat.id, nameCt: "v1:sub" })
    .returning();
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "expense",
    amountCt: "v1:amount",
    date: "2026-01-10",
    categoryId: cat.id,
    subcategoryId: sub.id,
    descriptionCt: "v1:desc",
  });
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "income",
    amountCt: "v1:income",
    date: "2026-01-05",
  });
  await db.insert(financialGoal).values({
    userId,
    monthlyIncomeCents: null,
    savedCents: null,
    retirementAge: null,
    annualRateBp: null,
    withdrawalRateBp: null,
    monthlyIncomeCt: "v1:a",
    savedCt: "v1:b",
    retirementAgeCt: "v1:c",
    annualRateCt: "v1:d",
    withdrawalRateCt: "v1:e",
  });
}

async function countsOf(userId: string) {
  const [tx, cat, sub, goal] = await Promise.all([
    db.select().from(transaction).where(eq(transaction.userId, userId)),
    db.select().from(category).where(eq(category.userId, userId)),
    db.select().from(subcategory).where(eq(subcategory.userId, userId)),
    db.select().from(financialGoal).where(eq(financialGoal.userId, userId)),
  ]);
  return { transactions: tx.length, categories: cat.length, subcategories: sub.length, goals: goal.length };
}

describe("vaultRepo.create / get", () => {
  it("stores the material and get returns the same material", async () => {
    const userId = await insertTestUser();
    await createVault(userId);

    expect(await vaultRepo.get(userId)).toEqual(MATERIAL);
  });

  it("returns null for a user without a vault (legacy account)", async () => {
    const userId = await insertTestUser();
    expect(await vaultRepo.get(userId)).toBeNull();
  });

  it("fails on a second create for the same user and keeps the first material", async () => {
    const userId = await insertTestUser();
    await createVault(userId);

    const second = createVault(userId, { ...MATERIAL, dekWrappedPw: "v1:other" });
    await expect(second).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
    expect(await vaultRepo.get(userId)).toEqual(MATERIAL);
  });

  it("does not leak across users", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await createVault(a);

    expect(await vaultRepo.get(b)).toBeNull();
  });

  it("rolls back with the surrounding transaction", async () => {
    const userId = await insertTestUser();
    await expect(
      db.transaction(async (tx) => {
        await vaultRepo.create(tx, userId, MATERIAL);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");

    expect(await vaultRepo.get(userId)).toBeNull();
  });
});

describe("vaultRepo.rewrap", () => {
  it("changes only salt, KDF params and dekWrappedPw; dekWrappedRecovery stays", async () => {
    const userId = await insertTestUser();
    await createVault(userId);
    await db.update(userVault).set({ birthDateCt: "v1:birth" }).where(eq(userVault.userId, userId));

    await db.transaction((tx) =>
      vaultRepo.rewrap(tx, userId, {
        salt: "BBBBBBBBBBBBBBBBBBBBBB",
        params: { memKib: 32768, iterations: 4, parallelism: 2 },
        dekWrappedPw: "v1:new-pw-wrapped",
      }),
    );

    expect(await vaultRepo.get(userId)).toEqual({
      kdfVersion: 1,
      salt: "BBBBBBBBBBBBBBBBBBBBBB",
      memKib: 32768,
      iterations: 4,
      parallelism: 2,
      dekWrappedPw: "v1:new-pw-wrapped",
      dekWrappedRecovery: MATERIAL.dekWrappedRecovery,
    });
    const [raw] = await db.select().from(userVault).where(eq(userVault.userId, userId));
    expect(raw.birthDateCt).toBe("v1:birth");
  });

  it("does not touch another user's vault", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await createVault(a);
    await createVault(b);

    await db.transaction((tx) =>
      vaultRepo.rewrap(tx, a, {
        salt: "BBBBBBBBBBBBBBBBBBBBBB",
        params: { memKib: 1024, iterations: 1, parallelism: 1 },
        dekWrappedPw: "v1:changed",
      }),
    );

    expect(await vaultRepo.get(b)).toEqual(MATERIAL);
  });
});

describe("vaultRepo.wipeFinancialData", () => {
  it("deletes every financial row of the user and clears birth_date_ct", async () => {
    const userId = await insertTestUser();
    await seedSealedData(userId);

    await db.transaction((tx) => vaultRepo.wipeFinancialData(tx, userId));

    expect(await countsOf(userId)).toEqual({ transactions: 0, categories: 0, subcategories: 0, goals: 0 });
    const percents = await db.select().from(categoryPercent);
    expect(percents).toHaveLength(0);
    const [raw] = await db.select().from(userVault).where(eq(userVault.userId, userId));
    expect(raw.birthDateCt).toBeNull();
    // The key material is not data: the wipe leaves it for the caller to rewrite.
    expect(await vaultRepo.get(userId)).toEqual(MATERIAL);
  });

  it("leaves another user's rows and birth date untouched", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await seedSealedData(a);
    await seedSealedData(b);

    await db.transaction((tx) => vaultRepo.wipeFinancialData(tx, a));

    expect(await countsOf(b)).toEqual({ transactions: 2, categories: 1, subcategories: 1, goals: 1 });
    const [raw] = await db.select().from(userVault).where(eq(userVault.userId, b));
    expect(raw.birthDateCt).toBe("v1:birth");
  });

  it("does nothing for a user without data and without a vault", async () => {
    const userId = await insertTestUser();
    await expect(db.transaction((tx) => vaultRepo.wipeFinancialData(tx, userId))).resolves.toBeUndefined();
  });
});


const emailOf = async (userId: string) => {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  return row.email;
};

describe("vaultRepo.kdfParamsFor", () => {
  it("returns the real salt and parameters of an account with a vault", async () => {
    const userId = await insertTestUser();
    await createVault(userId, { ...MATERIAL, salt: "CCCCCCCCCCCCCCCCCCCCCC", memKib: 32768, iterations: 4, parallelism: 2 });

    expect(await vaultRepo.kdfParamsFor(await emailOf(userId))).toEqual({
      mode: "v1",
      salt: "CCCCCCCCCCCCCCCCCCCCCC",
      m: 32768,
      t: 4,
      p: 2,
    });
  });

  it("returns the same decoy twice for an unknown e-mail, in the real format", async () => {
    const first = await vaultRepo.kdfParamsFor("ninguem@example.com");
    const second = await vaultRepo.kdfParamsFor("ninguem@example.com");

    expect(second).toEqual(first);
    if (first.mode !== "v1") throw new Error("decoy must be v1");
    expect(Object.keys(first).sort()).toEqual(["m", "mode", "p", "salt", "t"]);
    expect(first.salt).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(first.salt, "base64url")).toHaveLength(16);
    expect([first.m, first.t, first.p]).toEqual([65536, 3, 1]);
  });

  it("has the same keys as the answer for a real account", async () => {
    const userId = await insertTestUser();
    await createVault(userId);

    const real = await vaultRepo.kdfParamsFor(await emailOf(userId));
    const decoy = await vaultRepo.kdfParamsFor("ninguem@example.com");
    expect(Object.keys(decoy).sort()).toEqual(Object.keys(real).sort());
  });

  it("gives different decoys to different e-mails", async () => {
    const a = await vaultRepo.kdfParamsFor("a@example.com");
    const b = await vaultRepo.kdfParamsFor("b@example.com");

    expect(a).not.toEqual(b);
  });

  it("returns { mode: 'legacy' } for an account without a vault", async () => {
    const userId = await insertTestUser();

    expect(await vaultRepo.kdfParamsFor(await emailOf(userId))).toEqual({ mode: "legacy" });
  });

  it("treats other case and surrounding spaces as the normalized e-mail", async () => {
    const userId = await insertTestUser();
    await createVault(userId);
    const email = await emailOf(userId);

    const messy = await vaultRepo.kdfParamsFor(`  ${email.toUpperCase()} `);
    expect(messy).toEqual(await vaultRepo.kdfParamsFor(email));
    expect(messy).toMatchObject({ mode: "v1", salt: MATERIAL.salt });

    const decoy = await vaultRepo.kdfParamsFor("Ninguem@Example.com");
    expect(await vaultRepo.kdfParamsFor("  ninguem@example.com ")).toEqual(decoy);
  });
});

describe("vaultRepo birth date (sealed)", () => {
  it("set writes only the user's birth_date_ct and get returns the same text", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await createVault(a);
    await createVault(b);

    await vaultRepo.setBirthDateSealed(a, "v1:sealed-birth-a");

    expect(await vaultRepo.getBirthDateSealed(a)).toBe("v1:sealed-birth-a");
    expect(await vaultRepo.getBirthDateSealed(b)).toBeNull();
    expect(await vaultRepo.get(a)).toEqual(MATERIAL);
  });

  it("get returns null without a vault or without a date", async () => {
    const legacy = await insertTestUser();
    const sealedNoDate = await insertTestUser();
    await createVault(sealedNoDate);

    expect(await vaultRepo.getBirthDateSealed(legacy)).toBeNull();
    expect(await vaultRepo.getBirthDateSealed(sealedNoDate)).toBeNull();
    await vaultRepo.setBirthDateSealed(legacy, "v1:ignored");
    expect(await vaultRepo.getBirthDateSealed(legacy)).toBeNull();
  });

  it("the raw column holds sealed text, never a readable date, and user.birth_date is untouched", async () => {
    const userId = await insertTestUser();
    await createVault(userId);

    await vaultRepo.setBirthDateSealed(userId, "v1:c2VhbGVk");

    const [vault] = await db.select().from(userVault).where(eq(userVault.userId, userId));
    expect(vault.birthDateCt).toMatch(/^v1:[A-Za-z0-9_-]+$/);
    expect(vault.birthDateCt).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    const [u] = await db.select({ birthDate: user.birthDate }).from(user).where(eq(user.id, userId));
    expect(u.birthDate).toBeNull();
  });

  it("set replaces a previous value", async () => {
    const userId = await insertTestUser();
    await createVault(userId);
    await vaultRepo.setBirthDateSealed(userId, "v1:first");
    await vaultRepo.setBirthDateSealed(userId, "v1:second");

    expect(await vaultRepo.getBirthDateSealed(userId)).toBe("v1:second");
  });
});
