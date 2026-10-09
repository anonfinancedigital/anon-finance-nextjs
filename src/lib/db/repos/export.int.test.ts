import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { category, categoryPercent, subcategory, transaction, userVault } from "../schema";
import { exportRowsSealed } from "./export";
import { goalsRepo } from "./goals";
import { transactionsRepo } from "./transactions";
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

/** Sealed data of one user: tag keeps values distinguishable between users. */
async function seed(userId: string, tag: string) {
  await db.transaction((tx) => vaultRepo.create(tx, userId, MATERIAL));
  await vaultRepo.setBirthDateSealed(userId, `v1:${tag}-birth`);
  const [cat] = await db
    .insert(category)
    .values({ userId, nameCt: `v1:${tag}-cat`, color: 3, isInvestment: true })
    .returning();
  await db.insert(categoryPercent).values([
    { categoryId: cat.id, fromMonth: "0001-01-01", percentCt: `v1:${tag}-p1` },
    { categoryId: cat.id, fromMonth: "2026-06-01", percentCt: `v1:${tag}-p2` },
  ]);
  const [sub] = await db
    .insert(subcategory)
    .values({ userId, categoryId: cat.id, nameCt: `v1:${tag}-sub` })
    .returning();
  const single = randomUUID();
  const series = randomUUID();
  await transactionsRepo.createSealed(userId, {
    id: single,
    kind: "expense",
    date: "2026-03-10",
    categoryId: cat.id,
    subcategoryId: sub.id,
    amountCt: `v1:${tag}-a1`,
    descriptionCt: `v1:${tag}-d1`,
    recurrence: "none",
  });
  await transactionsRepo.createSealed(userId, {
    id: series,
    kind: "income",
    date: "2026-01-31",
    categoryId: null,
    subcategoryId: null,
    amountCt: `v1:${tag}-a2`,
    descriptionCt: null,
    recurrence: "until",
    recurrenceStartMonth: "2026-01",
    recurrenceEndMonth: "2026-12",
  });
  await goalsRepo.upsertSealed(userId, {
    monthlyIncomeCt: `v1:${tag}-g1`,
    savedCt: `v1:${tag}-g2`,
    retirementAgeCt: `v1:${tag}-g3`,
    annualRateCt: `v1:${tag}-g4`,
    withdrawalRateCt: `v1:${tag}-g5`,
  });
  return { cat, sub, single, series };
}

describe("exportRowsSealed", () => {
  it("returns only the rows of the requested user when two users have data", async () => {
    const a = await insertTestUser();
    const b = await insertTestUser();
    const sa = await seed(a, "a");
    await seed(b, "b");

    const out = await exportRowsSealed(a);
    expect(out.transactions.map((t) => t.id).sort()).toEqual([sa.single, sa.series].sort());
    expect(out.categories.map((c) => c.id)).toEqual([sa.cat.id]);
    expect(JSON.stringify(out)).not.toContain("v1:b-");
    expect(out.goal?.savedCt).toBe("v1:a-g2");
    expect(out.birthDateCt).toBe("v1:a-birth");
  });

  it("returns raw transactions with recurrence fields and ciphertext only", async () => {
    const a = await insertTestUser();
    const s = await seed(a, "a");

    const out = await exportRowsSealed(a);
    const series = out.transactions.find((t) => t.id === s.series)!;
    expect(series).toEqual({
      id: s.series,
      kind: "income",
      date: "2026-01-31",
      categoryId: null,
      subcategoryId: null,
      amountCt: "v1:a-a2",
      descriptionCt: null,
      recurring: true,
      recurrenceDay: 31,
      recurrenceEnd: "2026-12-01",
      seriesId: s.series,
    });
    const single = out.transactions.find((t) => t.id === s.single)!;
    expect(single).toMatchObject({ recurring: false, recurrenceDay: null, seriesId: null, amountCt: "v1:a-a1" });
    expect(Object.keys(single)).not.toContain("amountCents");
  });

  it("includes a deleted category with every percent version and its subcategories", async () => {
    const a = await insertTestUser();
    const s = await seed(a, "a");
    await db.update(category).set({ deletedFrom: "2026-08-01" }).where(eq(category.id, s.cat.id));

    const out = await exportRowsSealed(a);
    expect(out.categories).toEqual([
      {
        id: s.cat.id,
        color: 3,
        isInvestment: true,
        deletedFrom: "2026-08-01",
        nameCt: "v1:a-cat",
        versions: [
          { fromMonth: "0001-01-01", percentCt: "v1:a-p1" },
          { fromMonth: "2026-06-01", percentCt: "v1:a-p2" },
        ],
        subcategories: [{ id: s.sub.id, nameCt: "v1:a-sub" }],
      },
    ]);
  });

  it("returns empty lists and null fields for a user without data", async () => {
    const a = await insertTestUser();
    expect(await exportRowsSealed(a)).toEqual({
      transactions: [],
      categories: [],
      goal: null,
      birthDateCt: null,
    });
  });

  it("returns a null birth date when the vault has none", async () => {
    const a = await insertTestUser();
    await db.transaction((tx) => vaultRepo.create(tx, a, MATERIAL));
    expect((await exportRowsSealed(a)).birthDateCt).toBeNull();
    expect(await db.select().from(userVault).where(eq(userVault.userId, a))).toHaveLength(1);
    expect(await db.select().from(transaction).where(eq(transaction.userId, a))).toHaveLength(0);
  });
});
