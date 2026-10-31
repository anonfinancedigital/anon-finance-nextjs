import { describe, expect, it } from "vitest";
import { spendingShareSlices } from "./spending-share";

const row = (name: string, spentCents: number) => ({ name, spentCents });
const names = (list: { name: string }[]) => list.map((r) => r.name);

describe("spendingShareSlices", () => {
  it("puts the largest share first, as in the month on screen", () => {
    const rows = [
      row("Custos fixos", 560_409),
      row("Conforto", 745_269),
      row("Liberdade Financeira", 520_000),
      row("Viagens", 100_000),
      row("Conhecimento", 16_495),
      row("Gastos livres", 120_000),
    ];
    expect(names(spendingShareSlices(rows))).toEqual([
      "Conforto",
      "Custos fixos",
      "Liberdade Financeira",
      "Gastos livres",
      "Viagens",
      "Conhecimento",
    ]);
  });

  it("drops categories with no spending", () => {
    expect(names(spendingShareSlices([row("A", 0), row("B", 500), row("C", 0)]))).toEqual(["B"]);
  });

  it("keeps the original order between equal spending", () => {
    expect(names(spendingShareSlices([row("A", 100), row("B", 100), row("C", 300)]))).toEqual(["C", "A", "B"]);
  });

  it("does not change the rows it was given", () => {
    const rows = [row("A", 100), row("B", 300)];
    spendingShareSlices(rows);
    expect(names(rows)).toEqual(["A", "B"]);
  });
});
