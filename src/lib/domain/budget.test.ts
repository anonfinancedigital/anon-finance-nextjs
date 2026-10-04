import { describe, expect, it } from "vitest";
import { buildMonthlySummary, validateCategorySet } from "./budget";

const cats = (...bps: number[]) => bps.map((bp, i) => ({ name: `Categoria ${i + 1}`, bp }));

describe("validateCategorySet", () => {
  it("accepts a set that sums to 100% (30/30/10/10/20)", () => {
    expect(validateCategorySet(cats(3000, 3000, 1000, 1000, 2000))).toEqual({ ok: true });
  });

  it("rejects a set summing 105% with the spec message", () => {
    const result = validateCategorySet(cats(3000, 3000, 1000, 1000, 2000, 500));
    expect(result).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 105%)",
    });
  });

  it("rejects an empty set with (atual: 0%)", () => {
    expect(validateCategorySet([])).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 0%)",
    });
  });

  it("shows fractional sums with up to 2 decimals in the message", () => {
    expect(validateCategorySet(cats(3333, 3333, 3333))).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 99,99%)",
    });
  });

  it("rejects an empty name with an error on that field", () => {
    const result = validateCategorySet([
      { name: "  ", bp: 5000 },
      { name: "Lazer", bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["0.name"]);
    expect(result.fieldErrors?.["0.name"]).toEqual(expect.any(String));
  });

  it("rejects a 41-character name with an error on that field", () => {
    const result = validateCategorySet([
      { name: "Lazer", bp: 5000 },
      { name: "a".repeat(41), bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["1.name"]);
  });

  it("accepts a 40-character name", () => {
    expect(
      validateCategorySet([
        { name: "a".repeat(40), bp: 5000 },
        { name: "Lazer", bp: 5000 },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects case-insensitive duplicate names (Lazer/lazer) on the repeated field", () => {
    const result = validateCategorySet([
      { name: "Lazer", bp: 5000 },
      { name: "lazer", bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["1.name"]);
  });
});

describe("buildMonthlySummary", () => {
  const conforto = { id: "c1", name: "Conforto", percentBp: 3000 };
  const lazer = { id: "c2", name: "Lazer", percentBp: 7000 };

  const summarize = (incomeCents: number, spent: [string, number][], categories = [conforto]) =>
    buildMonthlySummary({ categories, incomeCents, spentByCategory: new Map(spent) });

  it("flags overspending: income 5.000, Conforto 30%, spent 1.600", () => {
    const [row] = summarize(500000, [["c1", 160000]]).rows;
    expect(row).toMatchObject({
      id: "c1",
      percentBp: 3000,
      targetCents: 150000,
      spentCents: 160000,
      remainingCents: -10000,
      overspent: true,
      overspentCents: 10000,
    });
  });

  it("is not overspent when spending equals the target and consumes 100%", () => {
    const [row] = summarize(500000, [["c1", 150000]]).rows;
    expect(row).toMatchObject({ overspent: false, overspentCents: 0, consumedPct: 100 });
  });

  it("reports the consumed percentage of the target while under it", () => {
    const [row] = summarize(500000, [["c1", 75000]]).rows;
    expect(row).toMatchObject({ overspent: false, consumedPct: 50, remainingCents: 75000 });
  });

  it("with income 0 any spending is overspent against a 0 target", () => {
    const [row] = summarize(0, [["c1", 1]]).rows;
    expect(row).toMatchObject({ targetCents: 0, overspent: true, overspentCents: 1 });
  });

  it("with income 0 and no spending the category is not overspent", () => {
    const [row] = summarize(0, []).rows;
    expect(row).toMatchObject({ targetCents: 0, spentCents: 0, overspent: false });
  });

  it("a category without expenses has spent 0 and remaining equal to the target", () => {
    const rows = summarize(500000, [["c1", 1000]], [conforto, lazer]).rows;
    expect(rows[1]).toMatchObject({
      id: "c2",
      targetCents: 350000,
      spentCents: 0,
      remainingCents: 350000,
      overspent: false,
    });
  });

  it.each([
    [500000, 160000, 40000, 300000],
    [100000, 160000, 40000, -100000],
  ])(
    "totals: income %i, spent %i + %i → balance %i (may be negative)",
    (income, a, b, balance) => {
      const summary = summarize(income, [["c1", a], ["c2", b]], [conforto, lazer]);
      expect(summary).toMatchObject({
        incomeCents: income,
        spentCents: a + b,
        balanceCents: balance,
      });
    },
  );

  it.each([
    [100001, 3333, 33330],
    [100001, 5000, 50001],
  ])("rounds the target with Math.round: %i × %i bp → %i", (income, percentBp, target) => {
    const [row] = summarize(income, [], [{ ...conforto, percentBp }]).rows;
    expect(row.targetCents).toBe(target);
  });
});
