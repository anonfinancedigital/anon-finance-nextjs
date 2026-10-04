import { describe, expect, it } from "vitest";
import { allocateCents, buildMonthlySummary, shareBp, validateCategorySet } from "./budget";

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
  const conforto = { id: "c1", name: "Conforto", percentBp: 3000, color: 1, subcategories: [] };
  const lazer = { id: "c2", name: "Lazer", percentBp: 7000, color: 2, subcategories: [] };

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

describe("allocateCents", () => {
  it("income 5.000,00 and 7,5% → R$ 375,00", () => {
    expect(allocateCents(500000, 750)).toBe(37500);
  });

  it.each([
    [3000, 150000],
    [3000, 150000],
    [2500, 125000],
    [750, 37500],
    [250, 12500],
    [500, 25000],
  ])("income 5.000,00 and %i bp → %i cents", (percentBp, cents) => {
    expect(allocateCents(500000, percentBp)).toBe(cents);
  });

  it("rounds a fraction of a cent: 100001 × 3333 bp → 33330", () => {
    expect(allocateCents(100001, 3333)).toBe(33330);
  });

  it("rounds half a cent up: 100001 × 5000 bp → 50001", () => {
    expect(allocateCents(100001, 5000)).toBe(50001);
  });
});

describe("validateCategorySet subcategories", () => {
  const withSubs = (...subs: string[][]) =>
    subs.map((names, i) => ({
      name: `Categoria ${i + 1}`,
      bp: 10000 / subs.length,
      subcategories: names.map((name) => ({ name })),
    }));
  const fieldErrorsOf = (result: ReturnType<typeof validateCategorySet>) =>
    result.ok ? undefined : result.fieldErrors;

  it("accepts valid subcategories and items without subcategories", () => {
    expect(validateCategorySet(withSubs(["Restaurante", "Streaming"], []))).toEqual({ ok: true });
    expect(validateCategorySet(cats(5000, 5000))).toEqual({ ok: true });
  });

  it("rejects an empty subcategory name on that field", () => {
    expect(fieldErrorsOf(validateCategorySet(withSubs(["Ok", ""], [])))).toEqual({
      "0.subcategories.1.name": "Informe o nome da subcategoria",
    });
  });

  it("rejects a whitespace-only subcategory name", () => {
    expect(fieldErrorsOf(validateCategorySet(withSubs(["   "], [])))).toEqual({
      "0.subcategories.0.name": "Informe o nome da subcategoria",
    });
  });

  it("accepts 40 characters and rejects 41", () => {
    expect(validateCategorySet(withSubs(["a".repeat(40)], []))).toEqual({ ok: true });
    expect(fieldErrorsOf(validateCategorySet(withSubs(["a".repeat(41)], [])))).toEqual({
      "0.subcategories.0.name": "O nome deve ter no máximo 40 caracteres",
    });
  });

  it("measures the 40 characters after trimming", () => {
    expect(validateCategorySet(withSubs([`  ${"a".repeat(40)}  `], []))).toEqual({ ok: true });
  });

  it("rejects a repeated name in the same category ignoring case", () => {
    expect(fieldErrorsOf(validateCategorySet(withSubs(["Restaurante", "restaurante"], [])))).toEqual(
      { "0.subcategories.1.name": "Já existe uma subcategoria com esse nome nesta categoria" },
    );
  });

  it("accepts the same name in different categories", () => {
    expect(validateCategorySet(withSubs(["Restaurante"], ["Restaurante"]))).toEqual({ ok: true });
  });

  it("accepts 30 subcategories in a category", () => {
    const names = Array.from({ length: 30 }, (_, k) => `Sub ${k}`);
    expect(validateCategorySet(withSubs(names, []))).toEqual({ ok: true });
  });

  it("rejects 31 subcategories with the limit message on the category", () => {
    const names = Array.from({ length: 31 }, (_, k) => `Sub ${k}`);
    expect(fieldErrorsOf(validateCategorySet(withSubs(names, [])))).toEqual({
      "0.subcategories": "Máximo de 30 subcategorias por categoria",
    });
  });

  it("keeps the 100% rule independent of the subcategories", () => {
    const set = [
      { name: "A", bp: 6000, subcategories: [{ name: "X" }] },
      { name: "B", bp: 3000, subcategories: [{ name: "Y" }] },
    ];
    expect(validateCategorySet(set)).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 90%)",
    });
  });
});

describe("shareBp", () => {
  it("rounds part × 10000 / total to basis points", () => {
    expect(shareBp(30000, 50000)).toBe(6000);
    expect(shareBp(1, 3)).toBe(3333);
    expect(shareBp(2, 3)).toBe(6667);
  });

  it("is 0 when the total is 0", () => {
    expect(shareBp(0, 0)).toBe(0);
  });
});

describe("buildMonthlySummary breakdown", () => {
  const sub = (id: string, name: string) => ({ id, name });
  const conforto = {
    id: "c1",
    name: "Conforto",
    percentBp: 3000,
    color: 1,
    subcategories: [sub("s1", "Restaurante"), sub("s2", "Streaming"), sub("s3", "Cinema")],
  };

  const breakdownOf = (spent: [string | null, number][], total?: number) => {
    const spentCents = total ?? spent.reduce((sum, [, cents]) => sum + cents, 0);
    const [row] = buildMonthlySummary({
      categories: [conforto],
      incomeCents: 500000,
      spentByCategory: new Map([["c1", spentCents]]),
      spentBySubcategory: new Map([["c1", new Map(spent)]]),
    }).rows;
    return row.breakdown;
  };

  it("details Restaurante 300, Streaming 100 and Sem subcategoria 100 of a 500 spend", () => {
    expect(
      breakdownOf([
        ["s1", 30000],
        ["s2", 10000],
        [null, 10000],
      ]),
    ).toEqual([
      { subcategoryId: "s1", name: "Restaurante", spentCents: 30000, shareBp: 6000 },
      { subcategoryId: "s2", name: "Streaming", spentCents: 10000, shareBp: 2000 },
      { subcategoryId: null, name: "Sem subcategoria", spentCents: 10000, shareBp: 2000 },
    ]);
  });

  it("lists only lines with spending above zero", () => {
    const lines = breakdownOf([
      ["s1", 5000],
      ["s2", 0],
    ]);
    expect(lines.map((l) => l.subcategoryId)).toEqual(["s1"]);
  });

  it("orders by spending descending, whichever line is largest", () => {
    const lines = breakdownOf([
      ["s1", 1000],
      ["s3", 3000],
      [null, 5000],
      ["s2", 2000],
    ]);
    expect(lines.map((l) => l.subcategoryId)).toEqual([null, "s3", "s2", "s1"]);
  });

  it("breaks ties by creation order with Sem subcategoria last", () => {
    const lines = breakdownOf([
      [null, 1000],
      ["s3", 1000],
      ["s1", 1000],
    ]);
    expect(lines.map((l) => l.subcategoryId)).toEqual(["s1", "s3", null]);
  });

  it("sums the breakdown to the category spending even when shares round", () => {
    const lines = breakdownOf([
      ["s1", 1],
      ["s2", 1],
      [null, 1],
    ]);
    expect(lines.reduce((sum, l) => sum + l.spentCents, 0)).toBe(3);
    expect(lines.map((l) => l.shareBp)).toEqual([3333, 3333, 3333]);
  });

  it("keeps a line that rounds to 0 bp when its spending is above zero", () => {
    const lines = breakdownOf([
      ["s1", 1],
      ["s2", 99999],
    ]);
    expect(lines.find((l) => l.subcategoryId === "s1")).toMatchObject({
      spentCents: 1,
      shareBp: 0,
    });
  });

  it("is empty when no subcategory spending is given", () => {
    const [row] = buildMonthlySummary({
      categories: [conforto],
      incomeCents: 500000,
      spentByCategory: new Map([["c1", 5000]]),
    }).rows;
    expect(row.breakdown).toEqual([]);
  });

  it("leaves target, remaining and overspending untouched by the breakdown", () => {
    const base = {
      categories: [conforto],
      incomeCents: 500000,
      spentByCategory: new Map([["c1", 160000]]),
    };
    const withSubs = buildMonthlySummary({
      ...base,
      spentBySubcategory: new Map([["c1", new Map([["s1", 160000]])]]),
    });
    const { breakdown, ...rowWithSubs } = withSubs.rows[0];
    const { breakdown: none, ...rowWithout } = buildMonthlySummary(base).rows[0];
    expect(breakdown).toHaveLength(1);
    expect(none).toEqual([]);
    expect(rowWithSubs).toEqual(rowWithout);
    expect(rowWithSubs).toMatchObject({ targetCents: 150000, overspentCents: 10000 });
  });
});
