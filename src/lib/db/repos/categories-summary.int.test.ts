import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { monthRange, type YearMonth } from "@/lib/domain/month";
import { db } from "../client";
import { transaction } from "../schema";
import { categoriesRepo } from "./categories";
import { transactionsRepo } from "./transactions";

setupTestDb();

const AUG = new Date("2026-08-10T15:00:00Z");
const OCT = new Date("2026-10-15T15:00:00Z");
const SEP: YearMonth = { year: 2026, month: 9 };
const OCT_M: YearMonth = { year: 2026, month: 10 };
const NOV: YearMonth = { year: 2026, month: 11 };

/** Same wiring as the summary page: month categories + month totals -> buildMonthlySummary. */
async function summaryFor(userId: string, month: YearMonth, now: Date) {
  const range = monthRange(month);
  const [categories, totals] = await Promise.all([
    categoriesRepo.listForMonth(userId, month, now),
    transactionsRepo.monthTotals(userId, range),
  ]);
  return buildMonthlySummary({ categories, ...totals });
}

const view = (s: Awaited<ReturnType<typeof summaryFor>>) =>
  s.rows.map((r) => ({ name: r.name, percentMicro: r.percentMicro, targetCents: r.targetCents }));

async function addTx(
  userId: string,
  date: string,
  kind: "income" | "expense",
  amountCents: number,
  categoryId: string | null = null,
) {
  await db.insert(transaction).values({ id: randomUUID(), userId, kind, amountCents, date, categoryId });
}

async function seed() {
  const userId = await insertTestUser();
  await categoriesRepo.replaceSet(
    userId,
    [
      { name: "A", percentMicro: 50000000, color: 1 },
      { name: "B", percentMicro: 50000000, color: 2 },
    ],
    AUG,
  );
  const [a, b] = await categoriesRepo.list(userId, AUG);
  await addTx(userId, "2026-09-05", "income", 100000);
  await addTx(userId, "2026-10-05", "income", 200000);
  return { userId, a, b };
}

describe("monthly summary with percent history", () => {
  it("keeps past-month targets after an edit; current month uses the new percents; future uses current", async () => {
    const { userId, a, b } = await seed();
    const sepBefore = view(await summaryFor(userId, SEP, AUG));
    expect(sepBefore).toEqual([
      { name: "A", percentMicro: 50000000, targetCents: 50000 },
      { name: "B", percentMicro: 50000000, targetCents: 50000 },
    ]);

    const edited = await categoriesRepo.replaceSet(
      userId,
      [
        { ...a, percentMicro: 40000000 },
        { ...b, percentMicro: 60000000 },
      ],
      OCT,
    );
    expect(edited).toEqual({ ok: true });

    expect(view(await summaryFor(userId, SEP, OCT))).toEqual(sepBefore);
    expect(view(await summaryFor(userId, OCT_M, OCT))).toEqual([
      { name: "A", percentMicro: 40000000, targetCents: 80000 },
      { name: "B", percentMicro: 60000000, targetCents: 120000 },
    ]);
    expect(view(await summaryFor(userId, NOV, OCT)).map((r) => r.percentMicro)).toEqual([
      40000000, 60000000,
    ]);
  });

  it("shows spending before a category existed at 0% with target 0, and omits it without spending", async () => {
    const { userId, a, b } = await seed();
    await categoriesRepo.replaceSet(
      userId,
      [
        { ...a, percentMicro: 40000000 },
        { ...b, percentMicro: 40000000 },
        { name: "C", percentMicro: 20000000, color: 3 },
      ],
      OCT,
    );
    const [, , c] = await categoriesRepo.list(userId, OCT);

    // September has no spending in C: C is omitted and the remaining targets still sum to income.
    const sepClean = await summaryFor(userId, SEP, OCT);
    expect(sepClean.rows.map((r) => r.name)).toEqual(["A", "B"]);
    expect(sepClean.rows.reduce((t, r) => t + r.targetCents, 0)).toBe(100000);
    expect(sepClean.rows.reduce((t, r) => t + r.percentMicro, 0)).toBe(100000000);

    // Spending in C in September (before C existed) keeps the row with 0% and target 0.
    await addTx(userId, "2026-09-20", "expense", 7000, c.id);
    const sep = await summaryFor(userId, SEP, OCT);
    expect(sep.rows.find((r) => r.name === "C")).toMatchObject({
      percentMicro: 0,
      targetCents: 0,
      spentCents: 7000,
      overspent: true,
      overspentCents: 7000,
    });
    expect(sep.spentCents).toBe(7000);

    // October includes C with its own percent.
    expect(view(await summaryFor(userId, OCT_M, OCT))).toEqual([
      { name: "A", percentMicro: 40000000, targetCents: 80000 },
      { name: "B", percentMicro: 40000000, targetCents: 80000 },
      { name: "C", percentMicro: 20000000, targetCents: 40000 },
    ]);
  });
});
