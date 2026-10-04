import { describe, expect, it } from "vitest";
import type { Category } from "./budget";
import { filterTransactions, parseTransactionFilter } from "./transaction-filter";

const categories: Category[] = [
  {
    id: "conforto",
    name: "Conforto",
    percentBp: 6000,
    color: 1,
    subcategories: [
      { id: "restaurante", name: "Restaurante" },
      { id: "streaming", name: "Streaming" },
    ],
  },
  {
    id: "lazer",
    name: "Lazer",
    percentBp: 4000,
    color: 2,
    subcategories: [{ id: "cinema", name: "Cinema" }],
  },
];

const tx = (id: string, categoryId: string | null, subcategoryId: string | null = null) => ({
  id,
  categoryId,
  subcategoryId,
});
const txs = [
  tx("salario", null),
  tx("almoco", "conforto", "restaurante"),
  tx("netflix", "conforto", "streaming"),
  tx("mercado", "conforto"),
  tx("filme", "lazer", "cinema"),
  tx("parque", "lazer"),
];
const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe("parseTransactionFilter", () => {
  it("is 'Todas' without params", () => {
    expect(parseTransactionFilter({}, categories)).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });

  it("reads a category", () => {
    expect(parseTransactionFilter({ categoria: "conforto" }, categories)).toEqual({
      categoryId: "conforto",
      subcategoryId: null,
    });
  });

  it("reads a subcategory of the category", () => {
    expect(
      parseTransactionFilter({ categoria: "conforto", subcategoria: "streaming" }, categories),
    ).toEqual({ categoryId: "conforto", subcategoryId: "streaming" });
  });

  it("reads 'nenhuma' as expenses without subcategory", () => {
    expect(
      parseTransactionFilter({ categoria: "conforto", subcategoria: "nenhuma" }, categories),
    ).toEqual({ categoryId: "conforto", subcategoryId: "none" });
  });

  it("ignores an unknown category, and the subcategory with it", () => {
    expect(
      parseTransactionFilter({ categoria: "inexistente", subcategoria: "streaming" }, categories),
    ).toEqual({ categoryId: null, subcategoryId: null });
  });

  it("ignores an unknown subcategory but keeps the category", () => {
    expect(
      parseTransactionFilter({ categoria: "conforto", subcategoria: "inexistente" }, categories),
    ).toEqual({ categoryId: "conforto", subcategoryId: null });
  });

  it("ignores a subcategory of another category", () => {
    expect(
      parseTransactionFilter({ categoria: "conforto", subcategoria: "cinema" }, categories),
    ).toEqual({ categoryId: "conforto", subcategoryId: null });
  });

  it("ignores a subcategory sent without a category", () => {
    expect(parseTransactionFilter({ subcategoria: "streaming" }, categories)).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
    expect(parseTransactionFilter({ subcategoria: "nenhuma" }, categories)).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });
});

describe("filterTransactions", () => {
  it("keeps the whole list, incomes included, for 'Todas'", () => {
    expect(ids(filterTransactions(txs, { categoryId: null, subcategoryId: null }))).toEqual(
      ids(txs),
    );
  });

  it("lists only the category's expenses, without incomes", () => {
    expect(ids(filterTransactions(txs, { categoryId: "conforto", subcategoryId: null }))).toEqual([
      "almoco",
      "netflix",
      "mercado",
    ]);
  });

  it("lists only the subcategory's expenses", () => {
    expect(
      ids(filterTransactions(txs, { categoryId: "conforto", subcategoryId: "restaurante" })),
    ).toEqual(["almoco"]);
  });

  it("lists only the category's expenses without subcategory for 'none'", () => {
    expect(ids(filterTransactions(txs, { categoryId: "conforto", subcategoryId: "none" }))).toEqual(
      ["mercado"],
    );
  });
});
