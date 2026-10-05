import { describe, expect, it } from "vitest";
import { buildSpendingPace, buildSpendingPaceViews } from "./spending-pace";

const expense = (date: string, amountCents: number) => ({ kind: "expense" as const, amountCents, date });
const income = (date: string, amountCents: number) => ({ kind: "income" as const, amountCents, date });

const past = "2030-01-01"; // after every month used below
const spent = (p: ReturnType<typeof buildSpendingPace>) => p.points.map((pt) => pt.spentCents);

describe("buildSpendingPace: spent curve", () => {
  const pace = buildSpendingPace({
    month: { year: 2026, month: 9 },
    today: past,
    totalTargetCents: 300000,
    occurrences: [expense("2026-09-01", 10000), expense("2026-09-10", 20000)],
  });

  it("has one point per day, days 1..30 in September", () => {
    expect(pace.points).toHaveLength(30);
    expect(pace.points[0].day).toBe(1);
    expect(pace.points[29].day).toBe(30);
  });

  it("accumulates: R$ 100 from day 1 to 9, R$ 300 from day 10 to 30", () => {
    expect(spent(pace).slice(0, 9)).toEqual(Array(9).fill(10000));
    expect(spent(pace).slice(9)).toEqual(Array(21).fill(30000));
  });

  it("sums several expenses of the same day into one point", () => {
    const same = buildSpendingPace({
      month: { year: 2026, month: 9 },
      today: past,
      totalTargetCents: 0,
      occurrences: [expense("2026-09-05", 1000), expense("2026-09-05", 2500)],
    });
    expect(same.points[3].spentCents).toBe(0);
    expect(same.points[4].spentCents).toBe(3500);
  });

  it("ignores income", () => {
    const withIncome = buildSpendingPace({
      month: { year: 2026, month: 9 },
      today: past,
      totalTargetCents: 0,
      occurrences: [income("2026-09-02", 500000), expense("2026-09-03", 700)],
    });
    expect(withIncome.points[1].spentCents).toBe(0);
    expect(withIncome.points[29].spentCents).toBe(700);
  });
});

describe("buildSpendingPace: month length", () => {
  it.each([
    [{ year: 2026, month: 2 }, 28],
    [{ year: 2028, month: 2 }, 29],
    [{ year: 2026, month: 4 }, 30],
    [{ year: 2026, month: 12 }, 31],
  ])("%j has %i points", (month, days) => {
    const pace = buildSpendingPace({ month, today: past, totalTargetCents: 1000, occurrences: [] });
    expect(pace.points).toHaveLength(days);
    expect(pace.points[days - 1].idealCents).toBe(1000);
  });
});

describe("buildSpendingPace: ideal reference", () => {
  it("is total × day ÷ days, reaching the total on the last day", () => {
    const pace = buildSpendingPace({
      month: { year: 2026, month: 9 },
      today: past,
      totalTargetCents: 300000,
      occurrences: [],
    });
    expect(pace.hasReference).toBe(true);
    expect(pace.points[0].idealCents).toBe(10000);
    expect(pace.points[14].idealCents).toBe(150000);
    expect(pace.points[29].idealCents).toBe(300000);
  });

  it("rounds to whole cents", () => {
    const pace = buildSpendingPace({
      month: { year: 2026, month: 9 },
      today: past,
      totalTargetCents: 100,
      occurrences: [],
    });
    expect(pace.points[0].idealCents).toBe(3); // 100 / 30 = 3,33
    expect(pace.points[1].idealCents).toBe(7); // 6,67
  });

  it("has no reference when the total target is zero", () => {
    const pace = buildSpendingPace({
      month: { year: 2026, month: 9 },
      today: past,
      totalTargetCents: 0,
      occurrences: [expense("2026-09-01", 100)],
    });
    expect(pace.hasReference).toBe(false);
    expect(pace.points.every((pt) => pt.idealCents === null)).toBe(true);
  });
});

describe("buildSpendingPace: which days have a spent value", () => {
  const base = {
    month: { year: 2026, month: 9 },
    totalTargetCents: 1000,
    occurrences: [expense("2026-09-02", 500)],
  };

  it("current month: the curve ends on today (day 15), later days have none", () => {
    const pace = buildSpendingPace({ ...base, today: "2026-09-15" });
    expect(pace.points[14].spentCents).toBe(500);
    expect(pace.points[15].spentCents).toBeNull();
    expect(pace.points[29].spentCents).toBeNull();
    expect(pace.points[29].idealCents).toBe(1000);
  });

  it("current month, first day: only day 1 has a value", () => {
    const pace = buildSpendingPace({ ...base, today: "2026-09-01" });
    expect(pace.points[0].spentCents).toBe(0);
    expect(pace.points[1].spentCents).toBeNull();
  });

  it("current month, last day: every day has a value", () => {
    const pace = buildSpendingPace({ ...base, today: "2026-09-30" });
    expect(pace.points.every((pt) => pt.spentCents !== null)).toBe(true);
  });

  it("future month: no day has a spent value, the reference stays", () => {
    const pace = buildSpendingPace({ ...base, today: "2026-08-31" });
    expect(pace.points.every((pt) => pt.spentCents === null)).toBe(true);
    expect(pace.points[29].idealCents).toBe(1000);
  });

  it("past month: the curve reaches the last day", () => {
    const pace = buildSpendingPace({ ...base, today: "2026-10-01" });
    expect(pace.points[29].spentCents).toBe(500);
  });
});

describe("buildSpendingPace: flags", () => {
  const month = { year: 2026, month: 9 };

  it("hasSpending is false without expenses (income does not count)", () => {
    const pace = buildSpendingPace({
      month,
      today: past,
      totalTargetCents: 1000,
      occurrences: [income("2026-09-01", 9999)],
    });
    expect(pace.hasSpending).toBe(false);
  });

  it("hasSpending is true with one expense", () => {
    const pace = buildSpendingPace({
      month,
      today: past,
      totalTargetCents: 1000,
      occurrences: [expense("2026-09-01", 1)],
    });
    expect(pace.hasSpending).toBe(true);
  });

  it("aboveIdeal is true when the last spent value exceeds the ideal of the same day", () => {
    const pace = buildSpendingPace({
      month,
      today: "2026-09-10",
      totalTargetCents: 3000, // ideal day 10 = 1000
      occurrences: [expense("2026-09-01", 1001)],
    });
    expect(pace.aboveIdeal).toBe(true);
  });

  it("aboveIdeal is false when spent equals the ideal", () => {
    const pace = buildSpendingPace({
      month,
      today: "2026-09-10",
      totalTargetCents: 3000,
      occurrences: [expense("2026-09-01", 1000)],
    });
    expect(pace.aboveIdeal).toBe(false);
  });

  it("aboveIdeal compares the last day with a value, not the month end", () => {
    const pace = buildSpendingPace({
      month,
      today: "2026-09-10",
      totalTargetCents: 3000,
      occurrences: [expense("2026-09-01", 2000)],
    });
    expect(pace.aboveIdeal).toBe(true); // 2000 > 1000 on day 10, though < 3000 at day 30
  });

  it("aboveIdeal is false without a reference", () => {
    const pace = buildSpendingPace({
      month,
      today: past,
      totalTargetCents: 0,
      occurrences: [expense("2026-09-01", 5000)],
    });
    expect(pace.aboveIdeal).toBe(false);
  });

  it("aboveIdeal is false in a future month", () => {
    const pace = buildSpendingPace({
      month,
      today: "2026-08-01",
      totalTargetCents: 3000,
      occurrences: [expense("2026-09-01", 5000)],
    });
    expect(pace.aboveIdeal).toBe(false);
  });
});

describe("buildSpendingPaceViews: consumption without investments (PACE-01..03)", () => {
  const base = { month: { year: 2026, month: 9 }, today: past };
  const inv = (date: string, amountCents: number) => ({ ...expense(date, amountCents), categoryId: "fii" });
  const food = (date: string, amountCents: number) => ({ ...expense(date, amountCents), categoryId: "food" });
  const categories = [
    { id: "food", targetCents: 300000, isInvestment: false },
    { id: "fii", targetCents: 300000, isInvestment: true },
  ];

  it("PACE-02: a R$ 3.000 investment on day 5 does not flag the consumption view, but flags the total view", () => {
    const { consumption, total } = buildSpendingPaceViews({
      ...base,
      categories,
      occurrences: [inv("2026-09-05", 300000), food("2026-09-10", 100000)],
    });
    expect(consumption.aboveIdeal).toBe(false);
    expect(spent(consumption)[4]).toBe(0);
    expect(spent(consumption)[29]).toBe(100000);
    expect(spent(total)[4]).toBe(300000);
    expect(total.aboveIdeal).toBe(false); // 400000 spent < 600000 target
  });

  it("PACE-02: the total view flags above ideal when investments push spending past the combined target", () => {
    const { total } = buildSpendingPaceViews({
      ...base,
      categories,
      occurrences: [inv("2026-09-05", 300000), food("2026-09-10", 350000)],
    });
    expect(total.aboveIdeal).toBe(true);
  });

  it("PACE-02: the ideal line uses only non-investment targets in the consumption view and all targets in the total view", () => {
    const { consumption, total } = buildSpendingPaceViews({ ...base, categories, occurrences: [food("2026-09-01", 1)] });
    expect(consumption.points[29].idealCents).toBe(300000);
    expect(total.points[29].idealCents).toBe(600000);
  });

  it("PACE-01: an expense without a category counts as consumption", () => {
    const { consumption } = buildSpendingPaceViews({
      ...base,
      categories,
      occurrences: [{ ...expense("2026-09-02", 5000), categoryId: null }],
    });
    expect(spent(consumption)[29]).toBe(5000);
  });

  it("PACE-01: a category without isInvestment is consumption", () => {
    const { consumption } = buildSpendingPaceViews({
      ...base,
      categories: [{ id: "x", targetCents: 1000 }],
      occurrences: [{ ...expense("2026-09-02", 700), categoryId: "x" }],
    });
    expect(spent(consumption)[29]).toBe(700);
  });

  it("PACE-03: a month with only investment expenses has no spending in the consumption view, but has in the total view", () => {
    const { consumption, total } = buildSpendingPaceViews({
      ...base,
      categories,
      occurrences: [inv("2026-09-05", 300000)],
    });
    expect(consumption.hasSpending).toBe(false);
    expect(total.hasSpending).toBe(true);
  });

  it("PACE-03: zero consumption target removes the ideal line of the consumption view only", () => {
    const { consumption, total } = buildSpendingPaceViews({
      ...base,
      categories: [
        { id: "food", targetCents: 0, isInvestment: false },
        { id: "fii", targetCents: 300000, isInvestment: true },
      ],
      occurrences: [food("2026-09-02", 1000)],
    });
    expect(consumption.hasReference).toBe(false);
    expect(total.hasReference).toBe(true);
  });

  it("with only consumption expenses, both views have the same spent curve", () => {
    const { consumption, total } = buildSpendingPaceViews({ ...base, categories, occurrences: [food("2026-09-03", 4000)] });
    expect(spent(consumption)).toEqual(spent(total));
  });
});
