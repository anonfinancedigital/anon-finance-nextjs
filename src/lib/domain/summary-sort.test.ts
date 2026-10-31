import { describe, expect, it } from "vitest";
import { DEFAULT_SUMMARY_SORT, nextSummarySort, sortSummaryRows } from "./summary-sort";

const row = (
  name: string,
  spentCents: number,
  targetCents: number,
  extra: { hasPercent?: boolean; percentMicro?: number } = {},
) => ({
  name,
  percentMicro: extra.percentMicro ?? 10_000_000,
  targetCents,
  spentCents,
  remainingCents: targetCents - spentCents,
  consumedPct: targetCents > 0 ? Math.round((spentCents * 100) / targetCents) : 0,
  hasPercent: extra.hasPercent,
});

// The month from the screen: two overspent, one close, two exact.
const rows = [
  row("Custos fixos", 560_409, 514_000),
  row("Conforto", 745_269, 518_448),
  row("Liberdade Financeira", 520_000, 550_000),
  row("Viagens", 100_000, 100_000),
];
const names = (list: { name: string }[]) => list.map((r) => r.name);

describe("nextSummarySort", () => {
  it("starts each column where it is most useful", () => {
    expect(nextSummarySort(null, "name")).toEqual({ key: "name", direction: "asc" });
    expect(nextSummarySort(null, "spent")).toEqual({ key: "spent", direction: "desc" });
    expect(nextSummarySort(null, "remaining")).toEqual({ key: "remaining", direction: "asc" });
  });

  it("starts on consumption, largest first", () => {
    expect(DEFAULT_SUMMARY_SORT).toEqual({ key: "consumption", direction: "desc" });
  });

  it("inverts on the second click and returns to the default order on the third", () => {
    const first = nextSummarySort(DEFAULT_SUMMARY_SORT, "spent");
    const second = nextSummarySort(first, "spent");
    expect(second).toEqual({ key: "spent", direction: "asc" });
    expect(nextSummarySort(second, "spent")).toEqual(DEFAULT_SUMMARY_SORT);
    const nameFirst = nextSummarySort(null, "name");
    expect(nextSummarySort(nameFirst, "name")).toEqual({ key: "name", direction: "desc" });
  });

  it("starts over at the first direction when another column is clicked", () => {
    expect(nextSummarySort({ key: "spent", direction: "asc" }, "target")).toEqual({ key: "target", direction: "desc" });
  });

  it("toggles the default column between its two directions", () => {
    const inverted = nextSummarySort(DEFAULT_SUMMARY_SORT, "consumption");
    expect(inverted).toEqual({ key: "consumption", direction: "asc" });
    expect(nextSummarySort(inverted, "consumption")).toEqual(DEFAULT_SUMMARY_SORT);
  });
});

describe("sortSummaryRows", () => {
  it("keeps the given order without a sort", () => {
    expect(sortSummaryRows(rows, null)).toBe(rows);
  });

  it("puts the largest spending first", () => {
    expect(names(sortSummaryRows(rows, { key: "spent", direction: "desc" }))).toEqual([
      "Conforto",
      "Custos fixos",
      "Liberdade Financeira",
      "Viagens",
    ]);
  });

  it("puts who overspent most first by remaining, smallest first", () => {
    expect(names(sortSummaryRows(rows, { key: "remaining", direction: "asc" }))).toEqual([
      "Conforto",
      "Custos fixos",
      "Viagens",
      "Liberdade Financeira",
    ]);
  });

  it("orders by consumption of the target", () => {
    expect(names(sortSummaryRows(rows, { key: "consumption", direction: "desc" }))).toEqual([
      "Conforto",
      "Custos fixos",
      "Viagens",
      "Liberdade Financeira",
    ]);
  });

  it("orders names alphabetically in Portuguese, accents included", () => {
    const list = [row("Viagens", 0, 0), row("Água", 0, 0), row("Conforto", 0, 0)];
    expect(names(sortSummaryRows(list, { key: "name", direction: "asc" }))).toEqual(["Água", "Conforto", "Viagens"]);
    expect(names(sortSummaryRows(list, { key: "name", direction: "desc" }))).toEqual(["Viagens", "Conforto", "Água"]);
  });

  it("keeps the original order between equal values, in both directions", () => {
    const tied = [row("A", 100, 0), row("B", 100, 0), row("C", 100, 0)];
    expect(names(sortSummaryRows(tied, { key: "spent", direction: "desc" }))).toEqual(["A", "B", "C"]);
    expect(names(sortSummaryRows(tied, { key: "spent", direction: "asc" }))).toEqual(["A", "B", "C"]);
  });

  it("leaves a category with no target at the end of the target columns, either direction", () => {
    const list = [row("Sem meta", 900, 0, { hasPercent: false }), row("Com meta", 100, 1_000), row("Outra", 200, 500)];
    for (const key of ["percent", "target", "remaining", "consumption"] as const) {
      for (const direction of ["asc", "desc"] as const) {
        expect(sortSummaryRows(list, { key, direction }).at(-1)?.name).toBe("Sem meta");
      }
    }
  });

  it("ranks a category with no target by what it spent", () => {
    const list = [row("Com meta", 100, 1_000), row("Sem meta", 900, 0, { hasPercent: false })];
    expect(names(sortSummaryRows(list, { key: "spent", direction: "desc" }))).toEqual(["Sem meta", "Com meta"]);
  });

  it("does not change the rows it was given", () => {
    const copy = [...rows];
    sortSummaryRows(rows, { key: "spent", direction: "desc" });
    expect(rows).toEqual(copy);
  });
});
