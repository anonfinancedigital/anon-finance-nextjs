import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { ImportPayload, VaultMaterial } from "@/lib/vault/types";
import { insertTestUser, setupTestDb } from "@/test/db";
import { user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, subcategory, transaction } from "../schema";
import { exportRowsSealed } from "./export";
import { goalsRepo } from "./goals";
import { importRepo } from "./import";
import { vaultRepo } from "./vault";

setupTestDb();

const MATERIAL: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw",
  dekWrappedRecovery: "v1:rec",
};

const goalDto = (tag: string) => ({
  monthlyIncomeCt: `v1:${tag}-g1`,
  savedCt: `v1:${tag}-g2`,
  retirementAgeCt: `v1:${tag}-g3`,
  annualRateCt: `v1:${tag}-g4`,
  withdrawalRateCt: `v1:${tag}-g5`,
});

/** A payload with an expense (with subcategory), a recurring income series of two segments and a deleted category. */
function samplePayload(tag: string): ImportPayload {
  const catA = randomUUID();
  const catB = randomUUID();
  const subA = randomUUID();
  const subB = randomUUID();
  const series = randomUUID();
  const base = { recurring: false, recurrenceDay: null, recurrenceEnd: null, seriesId: null, descriptionCt: null };
  return {
    categories: [
      {
        id: catA,
        color: 3,
        isInvestment: false,
        deletedFrom: null,
        nameCt: `v1:${tag}-catA`,
        versions: [
          { fromMonth: "0001-01-01", percentCt: `v1:${tag}-pA1` },
          { fromMonth: "2026-09-01", percentCt: `v1:${tag}-pA2` },
        ],
        subcategories: [{ id: subA, nameCt: `v1:${tag}-subA` }],
      },
      {
        id: catB,
        color: 7,
        isInvestment: true,
        deletedFrom: "2026-10-01",
        nameCt: `v1:${tag}-catB`,
        versions: [{ fromMonth: "0001-01-01", percentCt: `v1:${tag}-pB1` }],
        subcategories: [{ id: subB, nameCt: `v1:${tag}-subB` }],
      },
    ],
    transactions: [
      { ...base, id: randomUUID(), kind: "expense", date: "2026-10-05", categoryId: catA, subcategoryId: subA, amountCt: `v1:${tag}-a1`, descriptionCt: `v1:${tag}-d1` },
      { ...base, id: series, kind: "income", date: "2026-01-31", categoryId: null, subcategoryId: null, amountCt: `v1:${tag}-a2`, recurring: true, recurrenceDay: 31, recurrenceEnd: "2026-06-01", seriesId: series },
      { ...base, id: randomUUID(), kind: "income", date: "2026-08-31", categoryId: null, subcategoryId: null, amountCt: `v1:${tag}-a3`, recurring: true, recurrenceDay: 31, seriesId: series },
      { ...base, id: randomUUID(), kind: "expense", date: "2025-03-10", categoryId: catB, subcategoryId: null, amountCt: `v1:${tag}-a4` },
    ],
    goal: goalDto(tag),
    birthDateCt: `v1:${tag}-birth`,
  };
}

const counts = async (userId: string) => ({
  transactions: (await db.select({ n: count() }).from(transaction).where(eq(transaction.userId, userId)))[0].n,
  categories: (await db.select({ n: count() }).from(category).where(eq(category.userId, userId)))[0].n,
  subcategories: (await db.select({ n: count() }).from(subcategory).where(eq(subcategory.userId, userId)))[0].n,
});

async function withVault(userId: string, birthDateCt?: string) {
  await db.transaction((tx) => vaultRepo.create(tx, userId, MATERIAL));
  if (birthDateCt) await vaultRepo.setBirthDateSealed(userId, birthDateCt);
}

describe("importSealed into an empty account (IMPORT-04)", () => {
  it("writes every row and returns the counts", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    const payload = samplePayload("a");

    expect(await importRepo.importSealed(userId, payload)).toEqual({ ok: true, transactions: 4, categories: 2 });
    expect(await counts(userId)).toEqual({ transactions: 4, categories: 2, subcategories: 2 });
  });

  it("stores only ciphertext: the plain-text columns stay NULL", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    await importRepo.importSealed(userId, samplePayload("a"));

    const txs = await db.select().from(transaction).where(eq(transaction.userId, userId));
    expect(txs.every((t) => t.amountCents === null && t.description === null && t.amountCt !== null)).toBe(true);
    const cats = await db.select().from(category).where(eq(category.userId, userId));
    expect(cats.every((c) => c.name === null && c.nameCt !== null)).toBe(true);
    const versions = await db.select().from(categoryPercent);
    expect(versions.every((v) => v.percentMicro === null && v.percentCt !== null)).toBe(true);
    const subs = await db.select().from(subcategory).where(eq(subcategory.userId, userId));
    expect(subs.every((s) => s.name === null && s.nameCt !== null)).toBe(true);
    const [goal] = await db.select().from(financialGoal).where(eq(financialGoal.userId, userId));
    expect([goal.monthlyIncomeCents, goal.savedCents, goal.retirementAge, goal.annualRateBp, goal.withdrawalRateBp]).toEqual([null, null, null, null, null]);
  });

  it("round-trips through the export with the structure of the payload (IMPORT-27, 30, 32)", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    const payload = samplePayload("a");
    await importRepo.importSealed(userId, payload);

    const out = await exportRowsSealed(userId);
    const byId = <T extends { id: string }>(rows: T[]) => [...rows].sort((x, y) => x.id.localeCompare(y.id));
    expect(byId(out.transactions)).toEqual(byId(payload.transactions));
    expect(byId(out.categories)).toEqual(byId(payload.categories));
    expect(out.goal).toEqual(payload.goal);
    expect(out.birthDateCt).toBe("v1:a-birth");
    const [seg1, seg2] = out.transactions.filter((t) => t.recurring);
    expect(seg1.seriesId).toBe(seg2.seriesId);
  });

  it("writes more transactions than one batch holds", async () => {
    const userId = await insertTestUser();
    const payload: ImportPayload = {
      categories: [],
      transactions: Array.from({ length: 2_500 }, (_, i) => ({
        id: randomUUID(),
        kind: "income" as const,
        date: "2026-10-05",
        categoryId: null,
        subcategoryId: null,
        amountCt: `v1:amount-${i}`,
        descriptionCt: null,
        recurring: false,
        recurrenceDay: null,
        recurrenceEnd: null,
        seriesId: null,
      })),
      goal: null,
      birthDateCt: null,
    };

    expect(await importRepo.importSealed(userId, payload)).toEqual({ ok: true, transactions: 2_500, categories: 0 });
    expect((await counts(userId)).transactions).toBe(2_500);
  });

  it("accepts an empty payload without creating rows", async () => {
    const userId = await insertTestUser();
    expect(await importRepo.importSealed(userId, { categories: [], transactions: [], goal: null, birthDateCt: null })).toEqual({ ok: true, transactions: 0, categories: 0 });
    expect(await counts(userId)).toEqual({ transactions: 0, categories: 0, subcategories: 0 });
  });
});

describe("account must be empty (IMPORT-15, 16, 17)", () => {
  it("refuses an account with a transaction and writes nothing", async () => {
    const userId = await insertTestUser();
    await db.insert(transaction).values({ id: randomUUID(), userId, kind: "income", date: "2026-01-01", amountCt: "v1:x" });

    expect(await importRepo.importSealed(userId, samplePayload("a"))).toEqual({ ok: false, reason: "not_empty" });
    expect(await counts(userId)).toEqual({ transactions: 1, categories: 0, subcategories: 0 });
  });

  it("refuses an account with an active category and no transactions", async () => {
    const userId = await insertTestUser();
    await db.insert(category).values({ userId, nameCt: "v1:active", color: 1 });

    expect(await importRepo.importSealed(userId, samplePayload("a"))).toEqual({ ok: false, reason: "not_empty" });
    expect(await counts(userId)).toEqual({ transactions: 0, categories: 1, subcategories: 0 });
  });

  it("imports into an account emptied by the user: soft-deleted categories are removed with their versions and subcategories (IMPORT-34)", async () => {
    const userId = await insertTestUser();
    const [old] = await db.insert(category).values({ userId, nameCt: "v1:old", color: 1, deletedFrom: "2026-01-01" }).returning();
    await db.insert(categoryPercent).values({ categoryId: old.id, fromMonth: "0001-01-01", percentCt: "v1:old-pct" });
    await db.insert(subcategory).values({ userId, categoryId: old.id, nameCt: "v1:old-sub" });

    expect(await importRepo.importSealed(userId, samplePayload("a"))).toEqual({ ok: true, transactions: 4, categories: 2 });

    const rows = await db.select().from(category).where(eq(category.userId, userId));
    expect(rows.map((c) => c.nameCt).sort()).toEqual(["v1:a-catA", "v1:a-catB"]);
    expect(rows.some((c) => c.id === old.id)).toBe(false);
    expect((await db.select().from(categoryPercent)).map((v) => v.percentCt)).not.toContain("v1:old-pct");
    expect((await db.select().from(subcategory).where(eq(subcategory.userId, userId))).map((s) => s.nameCt)).not.toContain("v1:old-sub");
  });

  it("keeps the soft-deleted categories when the import fails (the cleanup is in the same transaction)", async () => {
    const userId = await insertTestUser();
    await db.insert(category).values({ userId, nameCt: "v1:old", color: 1, deletedFrom: "2026-01-01" });
    const bad = samplePayload("a");
    bad.transactions[0].categoryId = randomUUID();

    await expect(importRepo.importSealed(userId, bad)).rejects.toThrow();
    expect((await db.select().from(category).where(eq(category.userId, userId))).map((c) => c.nameCt)).toEqual(["v1:old"]);
  });

  it("does not remove the soft-deleted categories of another user", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await db.insert(category).values({ userId: b, nameCt: "v1:b-old", color: 1, deletedFrom: "2026-01-01" });

    await importRepo.importSealed(a, samplePayload("a"));
    expect((await db.select().from(category).where(eq(category.userId, b))).map((c) => c.nameCt)).toEqual(["v1:b-old"]);
  });

  it("an import that conflicts with an earlier one changes nothing: a second import is refused", async () => {
    const userId = await insertTestUser();
    await importRepo.importSealed(userId, samplePayload("a"));

    expect(await importRepo.importSealed(userId, samplePayload("b"))).toEqual({ ok: false, reason: "not_empty" });
    expect(await counts(userId)).toEqual({ transactions: 4, categories: 2, subcategories: 2 });
  });

  it("two simultaneous imports write exactly one of them", async () => {
    const userId = await insertTestUser();
    const results = await Promise.all([
      importRepo.importSealed(userId, samplePayload("a")),
      importRepo.importSealed(userId, samplePayload("b")),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, reason: "not_empty" }]);
    expect(await counts(userId)).toEqual({ transactions: 4, categories: 2, subcategories: 2 });
  });

  it("waits for a transaction that holds the user row and then sees what it wrote (the lock, not timing)", async () => {
    const userId = await insertTestUser();
    let importing: ReturnType<typeof importRepo.importSealed> | undefined;
    let settledEarly = false;

    await db.transaction(async (tx) => {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
      importing = importRepo.importSealed(userId, samplePayload("a"));
      importing.then(() => (settledEarly = true), () => (settledEarly = true));
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Still inside the holder: a lock-free import would have counted zero rows and finished by now.
      await tx.insert(transaction).values({ id: randomUUID(), userId, kind: "income", date: "2026-01-01", amountCt: "v1:held" });
    });

    expect(settledEarly).toBe(false);
    expect(await importing).toEqual({ ok: false, reason: "not_empty" });
    expect(await counts(userId)).toEqual({ transactions: 1, categories: 0, subcategories: 0 });
  });

  it("isEmpty is true for a new account or one with only deleted categories, false with a transaction or an active category", async () => {
    const fresh = await insertTestUser();
    expect(await importRepo.isEmpty(fresh)).toBe(true);

    const withTx = await insertTestUser();
    await db.insert(transaction).values({ id: randomUUID(), userId: withTx, kind: "income", date: "2026-01-01", amountCt: "v1:x" });
    expect(await importRepo.isEmpty(withTx)).toBe(false);

    const withCat = await insertTestUser();
    await db.insert(category).values({ userId: withCat, nameCt: "v1:c", color: 1 });
    expect(await importRepo.isEmpty(withCat)).toBe(false);

    const onlyDeleted = await insertTestUser();
    await db.insert(category).values({ userId: onlyDeleted, nameCt: "v1:d", color: 1, deletedFrom: "2026-01-01" });
    expect(await importRepo.isEmpty(onlyDeleted)).toBe(true);
  });

  it("isEmpty ignores the goal and the birth date", async () => {
    const userId = await insertTestUser();
    await withVault(userId, "v1:birth");
    await goalsRepo.upsertSealed(userId, goalDto("x"));
    expect(await importRepo.isEmpty(userId)).toBe(true);
  });
});

describe("rollback (IMPORT-14)", () => {
  it("leaves zero new rows when a later insert fails", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    const payload = samplePayload("a");
    payload.transactions[0].categoryId = randomUUID(); // category that was never inserted: FK violation

    await expect(importRepo.importSealed(userId, payload)).rejects.toThrow();
    expect(await counts(userId)).toEqual({ transactions: 0, categories: 0, subcategories: 0 });
    expect(await db.select().from(categoryPercent)).toHaveLength(0);
    expect(await db.select().from(financialGoal)).toHaveLength(0);
    expect(await vaultRepo.getBirthDateSealed(userId)).toBeNull();
  });
});

describe("scope by user (IMPORT-19)", () => {
  it("writes only rows of the given user and leaves the other user untouched", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    await importRepo.importSealed(b, samplePayload("b"));
    const before = await exportRowsSealed(b);

    await importRepo.importSealed(a, samplePayload("a"));

    expect(await counts(a)).toEqual({ transactions: 4, categories: 2, subcategories: 2 });
    expect(await counts(b)).toEqual({ transactions: 4, categories: 2, subcategories: 2 });
    expect(await exportRowsSealed(b)).toEqual(before);
    expect(JSON.stringify(await exportRowsSealed(a))).not.toContain("v1:b-");
  });
});

describe("goal (IMPORT-20, 21)", () => {
  it("imports the goal when the account has none", async () => {
    const userId = await insertTestUser();
    await importRepo.importSealed(userId, samplePayload("a"));
    expect(await goalsRepo.getSealed(userId)).toEqual(goalDto("a"));
  });

  it("keeps the existing goal untouched", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsertSealed(userId, goalDto("mine"));

    expect(await importRepo.importSealed(userId, samplePayload("a"))).toMatchObject({ ok: true });
    expect(await goalsRepo.getSealed(userId)).toEqual(goalDto("mine"));
  });

  it("writes no goal when the payload has none", async () => {
    const userId = await insertTestUser();
    await importRepo.importSealed(userId, { ...samplePayload("a"), goal: null });
    expect(await goalsRepo.getSealed(userId)).toBeNull();
  });
});

describe("birth date (IMPORT-23, 24)", () => {
  it("imports the birth date when the vault has none", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    await importRepo.importSealed(userId, samplePayload("a"));
    expect(await vaultRepo.getBirthDateSealed(userId)).toBe("v1:a-birth");
  });

  it("keeps the existing birth date untouched", async () => {
    const userId = await insertTestUser();
    await withVault(userId, "v1:mine-birth");
    await importRepo.importSealed(userId, samplePayload("a"));
    expect(await vaultRepo.getBirthDateSealed(userId)).toBe("v1:mine-birth");
  });

  it("writes no birth date when the payload has none", async () => {
    const userId = await insertTestUser();
    await withVault(userId);
    await importRepo.importSealed(userId, { ...samplePayload("a"), birthDateCt: null });
    expect(await vaultRepo.getBirthDateSealed(userId)).toBeNull();
  });
});
