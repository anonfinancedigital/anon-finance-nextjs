import { verifyPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import { insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { insertLegacyAccount } from "@/test/legacy";
import { account, user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, subcategory, transaction, userVault } from "../schema";
import { type LegacyCommit, legacyRepo } from "./legacy";
import { vaultRepo } from "./vault";

setupTestDb();

const VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw",
  dekWrappedRecovery: "v1:rec",
};
const AUTH_SECRET = "segredo-de-login-novo";

type Account = Awaited<ReturnType<typeof insertLegacyAccount>>;

/** The package the browser would send for `a`, with stand-in ciphertexts `v1:<kind>-<id>`. */
async function packageFor(a: Pick<Account, "userId">): Promise<LegacyCommit> {
  const res = await legacyRepo.readPlain(a.userId);
  if (!res.ok) throw new Error("expected legacy");
  const { plain } = res;
  return {
    authSecret: AUTH_SECRET,
    vault: VAULT,
    transactions: plain.transactions.map((t) => ({
      id: t.id,
      amountCt: `v1:amount-${t.id}`,
      descriptionCt: t.description === null ? null : `v1:desc-${t.id}`,
    })),
    categories: plain.categories.map((c) => ({
      id: c.id,
      nameCt: `v1:cat-${c.id}`,
      versions: c.versions.map((v) => ({ fromMonth: v.fromMonth, percentCt: `v1:pct-${c.id}-${v.fromMonth}` })),
      subcategories: c.subcategories.map((s) => ({ id: s.id, nameCt: `v1:sub-${s.id}` })),
    })),
    goal: plain.goal && {
      monthlyIncomeCt: "v1:g1",
      savedCt: "v1:g2",
      retirementAgeCt: "v1:g3",
      annualRateCt: "v1:g4",
      withdrawalRateCt: "v1:g5",
    },
    birthDateCt: plain.birthDate && "v1:birth",
  };
}

const hashOf = async (userId: string) =>
  (await db.select().from(account).where(eq(account.userId, userId)))[0].password!;

/** Raw rows of the user, every column as stored. */
async function rawRows(userId: string) {
  return {
    transactions: await db.select().from(transaction).where(eq(transaction.userId, userId)).orderBy(asc(transaction.id)),
    categories: await db.select().from(category).where(eq(category.userId, userId)).orderBy(asc(category.id)),
    versions: (
      await db
        .select({ v: categoryPercent })
        .from(categoryPercent)
        .innerJoin(category, eq(category.id, categoryPercent.categoryId))
        .where(eq(category.userId, userId))
        .orderBy(asc(categoryPercent.categoryId), asc(categoryPercent.fromMonth))
    ).map((r) => r.v),
    subcategories: await db.select().from(subcategory).where(eq(subcategory.userId, userId)).orderBy(asc(subcategory.id)),
    goals: await db.select().from(financialGoal).where(eq(financialGoal.userId, userId)),
    vaults: await db.select().from(userVault).where(eq(userVault.userId, userId)),
    owner: (await db.select().from(user).where(eq(user.id, userId)))[0],
    hash: await hashOf(userId),
  };
}

describe("legacyRepo.commitMigration", () => {
  it("seals every row, leaves no plain-text column, creates the vault and swaps the hash", async () => {
    const a = await insertLegacyAccount();
    const pkg = await packageFor(a);

    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, pkg)).toBe("ok");

    const raw = await rawRows(a.userId);
    expect(raw.transactions).toHaveLength(2);
    for (const t of raw.transactions) {
      expect(t.amountCents).toBeNull();
      expect(t.description).toBeNull();
      expect(t.amountCt).toBe(`v1:amount-${t.id}`);
    }
    expect(raw.transactions.find((t) => t.id === a.expenseId)!.descriptionCt).toBe(`v1:desc-${a.expenseId}`);
    expect(raw.transactions.find((t) => t.id === a.seriesId)!.descriptionCt).toBeNull();
    expect(raw.transactions.find((t) => t.id === a.seriesId)).toMatchObject({
      recurring: true,
      recurrenceDay: 31,
      recurrenceEnd: "2026-12-01",
    });
    expect(raw.categories).toHaveLength(2);
    for (const c of raw.categories) {
      expect(c.name).toBeNull();
      expect(c.nameCt).toBe(`v1:cat-${c.id}`);
    }
    expect(raw.versions).toHaveLength(3);
    for (const v of raw.versions) {
      expect(v.percentMicro).toBeNull();
      expect(v.percentCt).toBe(`v1:pct-${v.categoryId}-${v.fromMonth}`);
    }
    expect(raw.subcategories[0]).toMatchObject({ name: null, nameCt: `v1:sub-${a.sub.id}` });
    expect(raw.goals[0]).toMatchObject({
      monthlyIncomeCents: null,
      savedCents: null,
      retirementAge: null,
      annualRateBp: null,
      withdrawalRateBp: null,
      monthlyIncomeCt: "v1:g1",
      withdrawalRateCt: "v1:g5",
    });
    expect(raw.owner.birthDate).toBeNull();
    expect(raw.vaults).toHaveLength(1);
    expect(raw.vaults[0]).toMatchObject({ ...VAULT, birthDateCt: "v1:birth" });
    expect(raw.hash).not.toBe(AUTH_SECRET);
    expect(await verifyPassword({ hash: raw.hash, password: AUTH_SECRET })).toBe(true);
    expect(await verifyPassword({ hash: raw.hash, password: TEST_PASSWORD })).toBe(false);
    expect(await legacyRepo.isLegacy(a.userId)).toBe(false);
  });

  it("returns wrong_password for a wrong old password and changes nothing", async () => {
    const a = await insertLegacyAccount();
    const before = await rawRows(a.userId);

    expect(await legacyRepo.commitMigration(a.userId, "senha-errada", await packageFor(a))).toBe("wrong_password");

    expect(await rawRows(a.userId)).toEqual(before);
  });

  it("returns mismatch and rolls back when the package lacks an existing transaction", async () => {
    const a = await insertLegacyAccount();
    const before = await rawRows(a.userId);
    const pkg = await packageFor(a);
    pkg.transactions = pkg.transactions.slice(1);

    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, pkg)).toBe("mismatch");

    expect(await rawRows(a.userId)).toEqual(before);
  });

  it("returns mismatch when the package lacks a subcategory, a percent version or has an extra id", async () => {
    const a = await insertLegacyAccount();
    const before = await rawRows(a.userId);

    const noSub = await packageFor(a);
    noSub.categories.forEach((c) => (c.subcategories = []));
    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, noSub)).toBe("mismatch");

    const noVersion = await packageFor(a);
    noVersion.categories[0].versions = noVersion.categories[0].versions.slice(1);
    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, noVersion)).toBe("mismatch");

    const extra = await packageFor(a);
    extra.transactions.push({ id: "00000000-0000-4000-8000-000000000000", amountCt: "v1:x", descriptionCt: null });
    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, extra)).toBe("mismatch");

    const noGoal = await packageFor(a);
    noGoal.goal = null;
    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, noGoal)).toBe("mismatch");

    expect(await rawRows(a.userId)).toEqual(before);
  });

  it("rolls back every write when a later step fails (invalid vault)", async () => {
    const a = await insertLegacyAccount();
    const before = await rawRows(a.userId);
    const pkg = await packageFor(a);
    pkg.vault = { ...VAULT, kdfVersion: 2 as unknown as 1 };

    await expect(legacyRepo.commitMigration(a.userId, TEST_PASSWORD, pkg)).rejects.toThrow();

    expect(await rawRows(a.userId)).toEqual(before);
    expect(await legacyRepo.isLegacy(a.userId)).toBe(true);
  });

  it("returns not_legacy for an account that already has a vault, touching nothing", async () => {
    const a = await insertLegacyAccount();
    const pkg = await packageFor(a);
    await db.transaction((tx) => vaultRepo.create(tx, a.userId, VAULT));
    const before = await rawRows(a.userId);

    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, pkg)).toBe("not_legacy");

    expect(await rawRows(a.userId)).toEqual(before);
  });

  it("does not touch another user's rows", async () => {
    const a = await insertLegacyAccount("a@x.com");
    const b = await insertLegacyAccount("b@x.com");
    const bBefore = await rawRows(b.userId);

    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, await packageFor(a))).toBe("ok");

    expect(await rawRows(b.userId)).toEqual(bBefore);
    expect(await legacyRepo.isLegacy(b.userId)).toBe(true);
  });

  it("migrates an account without goal or birth date", async () => {
    const a = await insertLegacyAccount();
    await db.delete(financialGoal).where(eq(financialGoal.userId, a.userId));
    await db.update(user).set({ birthDate: null }).where(eq(user.id, a.userId));

    expect(await legacyRepo.commitMigration(a.userId, TEST_PASSWORD, await packageFor(a))).toBe("ok");
    expect((await rawRows(a.userId)).vaults[0].birthDateCt).toBeNull();
  });

  it("migrates a legacy account without any row: creates the vault, swaps the hash and ends legacy", async () => {
    const userId = await insertCredentialUser("vazio@x.com");
    const pkg = await packageFor({ userId });
    expect(pkg).toEqual({
      authSecret: AUTH_SECRET,
      vault: VAULT,
      transactions: [],
      categories: [],
      goal: null,
      birthDateCt: null,
    });

    expect(await legacyRepo.commitMigration(userId, TEST_PASSWORD, pkg)).toBe("ok");

    const raw = await rawRows(userId);
    expect(raw.transactions).toEqual([]);
    expect(raw.categories).toEqual([]);
    expect(raw.versions).toEqual([]);
    expect(raw.subcategories).toEqual([]);
    expect(raw.goals).toEqual([]);
    expect(raw.vaults).toHaveLength(1);
    expect(raw.vaults[0]).toMatchObject({ ...VAULT, userId, birthDateCt: null });
    expect(await verifyPassword({ hash: raw.hash, password: AUTH_SECRET })).toBe(true);
    expect(await verifyPassword({ hash: raw.hash, password: TEST_PASSWORD })).toBe(false);
    expect(await legacyRepo.isLegacy(userId)).toBe(false);
  });
});
