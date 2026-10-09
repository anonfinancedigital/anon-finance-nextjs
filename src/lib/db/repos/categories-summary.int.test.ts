import { randomUUID } from "node:crypto";
import { and, eq, gte, lt } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { computeMonthTotals } from "@/lib/vault/month-totals";
import { monthRange, type YearMonth } from "@/lib/domain/month";
import { db } from "../client";
import { categoryPercent, transaction } from "../schema";
import { categoriesRepo } from "./categories";

setupTestDb();

const AUG = new Date("2026-08-10T15:00:00Z");
const OCT = new Date("2026-10-15T15:00:00Z");
const SEP: YearMonth = { year: 2026, month: 9 };
const OCT_M: YearMonth = { year: 2026, month: 10 };
const NOV: YearMonth = { year: 2026, month: 11 };

/** Totals of the single plain-text rows dated in the range, as the vault computes them for a month. */
async function monthTotals(userId: string, range: { start: string; endExclusive: string }) {
  const rows = await db
    .select()
    .from(transaction)
    .where(
      and(eq(transaction.userId, userId), gte(transaction.date, range.start), lt(transaction.date, range.endExclusive)),
    );
  return computeMonthTotals(
    rows.map((r) => ({
      kind: r.kind,
      amountCents: r.amountCents!,
      categoryId: r.categoryId,
      subcategoryId: r.subcategoryId,
    })),
  );
}

/** Same wiring as the summary page: month categories + month totals -> buildMonthlySummary. */
async function summaryFor(userId: string, month: YearMonth, now: Date) {
  const range = monthRange(month);
  const [categories, totals] = await Promise.all([
    categoriesRepo.listForMonth(userId, month, now),
    monthTotals(userId, range),
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

  it("shows a category before it existed with no target, never overspent, and keeps the other targets summing to income", async () => {
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

    // September has no spending in C: C is listed without target and the targets still sum to income.
    const sepClean = await summaryFor(userId, SEP, OCT);
    expect(sepClean.rows.map((r) => r.name)).toEqual(["A", "B", "C"]);
    expect(sepClean.rows.find((r) => r.name === "C")).toMatchObject({
      hasPercent: false,
      targetCents: 0,
      overspent: false,
    });
    expect(sepClean.rows.reduce((t, r) => t + r.targetCents, 0)).toBe(100000);
    expect(sepClean.rows.reduce((t, r) => t + r.percentMicro, 0)).toBe(100000000);

    // Spending in C in September (before C existed) keeps the row with no target and no overspend.
    await addTx(userId, "2026-09-20", "expense", 7000, c.id);
    const sep = await summaryFor(userId, SEP, OCT);
    expect(sep.rows.find((r) => r.name === "C")).toMatchObject({
      percentMicro: 0,
      targetCents: 0,
      spentCents: 7000,
      overspent: false,
      overspentCents: 0,
    });
    expect(sep.spentCents).toBe(7000);

    // October includes C with its own percent.
    expect(view(await summaryFor(userId, OCT_M, OCT))).toEqual([
      { name: "A", percentMicro: 40000000, targetCents: 80000 },
      { name: "B", percentMicro: 40000000, targetCents: 80000 },
      { name: "C", percentMicro: 20000000, targetCents: 40000 },
    ]);
  });

  it("ignores versions that start after the current month when showing a later month", async () => {
    const { userId, a } = await seed();
    await db.insert(categoryPercent).values({
      categoryId: a.id,
      fromMonth: "2026-12-01",
      percentMicro: 10000000,
    });
    const dec: YearMonth = { year: 2026, month: 12 };
    expect(view(await summaryFor(userId, dec, OCT)).map((r) => r.percentMicro)).toEqual([
      50000000, 50000000,
    ]);
  });
});
