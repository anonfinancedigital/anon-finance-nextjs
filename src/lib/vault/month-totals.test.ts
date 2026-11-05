import { describe, expect, it } from "vitest";
import { buildMonthlySummary, type Category } from "@/lib/domain/budget";
import { computeMonthTotals } from "./month-totals";

const income = (amountCents: number) =>
  ({ kind: "income", amountCents, categoryId: null, subcategoryId: null }) as const;
const expense = (amountCents: number, categoryId: string | null, subcategoryId: string | null = null) =>
  ({ kind: "expense", amountCents, categoryId, subcategoryId }) as const;

/**
 * Fixed month: salary + a recurring income; category A with two subcategories and an expense
 * without one; category B with a recurring expense (one occurrence in the month); an expense with
 * no category. The recurring occurrences are paid, so every row counts (AD-018).
 */
const MONTH = [
  income(500000),
  { ...income(120000), recurring: true, paid: true },
  expense(15000, "A", "A1"),
  expense(5050, "A", "A1"),
  expense(3000, "A", "A2"),
  expense(1999, "A"),
  { ...expense(25000, "B"), recurring: true, paid: true },
  expense(700, null),
];

describe("computeMonthTotals", () => {
  it("receita do mês soma as receitas, recorrente uma vez", () => {
    expect(computeMonthTotals(MONTH).incomeCents).toBe(620000);
  });

  it("gasto por categoria em centavos; despesa sem categoria fica fora", () => {
    expect(computeMonthTotals(MONTH).spentByCategory).toEqual(
      new Map([
        ["A", 25049],
        ["B", 25000],
      ]),
    );
  });

  it("gasto por subcategoria com a chave null para despesa sem subcategoria", () => {
    expect(computeMonthTotals(MONTH).spentBySubcategory).toEqual(
      new Map([
        [
          "A",
          new Map<string | null, number>([
            ["A1", 20050],
            ["A2", 3000],
            [null, 1999],
          ]),
        ],
        ["B", new Map<string | null, number>([[null, 25000]])],
      ]),
    );
  });

  it("mês vazio dá zeros e mapas vazios", () => {
    const totals = computeMonthTotals([]);
    expect(totals.incomeCents).toBe(0);
    expect(totals.spentByCategory.size).toBe(0);
    expect(totals.spentBySubcategory.size).toBe(0);
  });

  it("buildMonthlySummary com esses totais devolve linhas, saldo e gasto esperados", () => {
    const categories: Category[] = [
      {
        id: "A",
        name: "Moradia",
        percentMicro: 40_000_000,
        color: 1,
        subcategories: [
          { id: "A1", name: "Aluguel" },
          { id: "A2", name: "Luz" },
        ],
      },
      { id: "B", name: "Lazer", percentMicro: 12_500_000, color: 2, subcategories: [] },
    ];
    const summary = buildMonthlySummary({ categories, ...computeMonthTotals(MONTH) });

    expect(summary.incomeCents).toBe(620000);
    expect(summary.spentCents).toBe(50049);
    expect(summary.balanceCents).toBe(569951);
    expect(
      summary.rows.map((r) => ({
        id: r.id,
        targetCents: r.targetCents,
        spentCents: r.spentCents,
        remainingCents: r.remainingCents,
        consumedPct: r.consumedPct,
      })),
    ).toEqual([
      { id: "A", targetCents: 248000, spentCents: 25049, remainingCents: 222951, consumedPct: 10 },
      { id: "B", targetCents: 77500, spentCents: 25000, remainingCents: 52500, consumedPct: 32 },
    ]);
    expect(summary.rows[0].breakdown).toEqual([
      { subcategoryId: "A1", name: "Aluguel", spentCents: 20050, shareBp: 8004 },
      { subcategoryId: "A2", name: "Luz", spentCents: 3000, shareBp: 1198 },
      { subcategoryId: null, name: "Sem subcategoria", spentCents: 1999, shareBp: 798 },
    ]);
  });
});

describe("computeMonthTotals com ocorrências não pagas (PAGO-05)", () => {
  it("gasto recorrente de R$ 100 não pago: categoria e subcategoria R$ 0; pago: R$ 100", () => {
    const unpaid = computeMonthTotals([{ ...expense(10000, "A", "A1"), recurring: true, paid: false }]);
    expect(unpaid.spentByCategory.get("A") ?? 0).toBe(0);
    expect(unpaid.spentBySubcategory.get("A")?.get("A1") ?? 0).toBe(0);

    const paid = computeMonthTotals([{ ...expense(10000, "A", "A1"), recurring: true, paid: true }]);
    expect(paid.spentByCategory.get("A")).toBe(10000);
    expect(paid.spentBySubcategory.get("A")?.get("A1")).toBe(10000);
  });

  it("ganho recorrente não recebido fica fora da receita; recebido entra", () => {
    expect(computeMonthTotals([income(500000), { ...income(120000), recurring: true, paid: false }]).incomeCents).toBe(500000);
    expect(computeMonthTotals([income(500000), { ...income(120000), recurring: true, paid: true }]).incomeCents).toBe(620000);
  });

  it("recorrente com paid ausente ou null não soma", () => {
    const totals = computeMonthTotals([
      { ...income(120000), recurring: true },
      { ...expense(10000, "A"), recurring: true, paid: null },
    ]);
    expect(totals.incomeCents).toBe(0);
    expect(totals.spentByCategory.size).toBe(0);
    expect(totals.spentBySubcategory.size).toBe(0);
  });

  it("avulso soma com ou sem paid", () => {
    const totals = computeMonthTotals([
      income(1000),
      { ...income(2000), recurring: false, paid: null },
      expense(300, "A"),
      { ...expense(400, "A"), recurring: false, paid: false },
    ]);
    expect(totals.incomeCents).toBe(3000);
    expect(totals.spentByCategory.get("A")).toBe(700);
  });

  it("todas as linhas recorrentes não pagas: totais zerados", () => {
    const totals = computeMonthTotals([
      { ...income(120000), recurring: true, paid: false },
      { ...expense(25000, "B"), recurring: true, paid: false },
    ]);
    expect(totals.incomeCents).toBe(0);
    expect(totals.spentByCategory.size).toBe(0);
    expect(totals.spentBySubcategory.size).toBe(0);
  });
});
