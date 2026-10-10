import { describe, expect, it } from "vitest";
import { deriveMonthState, deriveSetup, monthLongName, previousMonth } from "./onboarding";

describe("deriveSetup", () => {
  it("with nothing set up: 0 done, current is categories, not complete", () => {
    const s = deriveSetup({ categories: 0, transactions: 0, hasGoal: false });
    expect(s.doneCount).toBe(0);
    expect(s.currentId).toBe("categories");
    expect(s.complete).toBe(false);
  });

  it("with only categories: 1 done, current is transaction", () => {
    const s = deriveSetup({ categories: 2, transactions: 0, hasGoal: false });
    expect(s.doneCount).toBe(1);
    expect(s.complete).toBe(false);
    expect(s.currentId).toBe("transaction");
    expect(s.steps.map((x) => x.done)).toEqual([true, false, false]);
  });

  it("marks steps done in any order; current is the first pending", () => {
    const s = deriveSetup({ categories: 0, transactions: 3, hasGoal: true });
    expect(s.doneCount).toBe(2);
    expect(s.complete).toBe(false);
    expect(s.currentId).toBe("categories");
    expect(s.steps.map((x) => x.done)).toEqual([false, true, true]);
  });

  it("with everything done: complete, no current step, 3 done", () => {
    const s = deriveSetup({ categories: 1, transactions: 1, hasGoal: true });
    expect(s.complete).toBe(true);
    expect(s.currentId).toBeNull();
    expect(s.doneCount).toBe(3);
  });

  it("only the goal pending: current is goal", () => {
    const s = deriveSetup({ categories: 1, transactions: 1, hasGoal: false });
    expect(s.currentId).toBe("goal");
    expect(s.doneCount).toBe(2);
    expect(s.complete).toBe(false);
  });

  it("uses the exact step ids and labels in order", () => {
    const s = deriveSetup({ categories: 0, transactions: 0, hasGoal: false });
    expect(s.steps.map((x) => [x.id, x.label])).toEqual([
      ["categories", "Definir sua receita e categorias"],
      ["transaction", "Registrar sua primeira transação"],
      ["goal", "Definir sua meta"],
    ]);
  });
});

describe("deriveMonthState", () => {
  it.each([
    [{ monthTransactions: 0, totalTransactions: 0 }, "first-access"],
    [{ monthTransactions: 0, totalTransactions: 5 }, "empty-month"],
    [{ monthTransactions: 1, totalTransactions: 1 }, "has-data"],
    [{ monthTransactions: 3, totalTransactions: 5 }, "has-data"],
  ] as const)("%j -> %s", (input, expected) => {
    expect(deriveMonthState(input)).toBe(expected);
  });
});

describe("previousMonth", () => {
  it("crosses into December of the previous year from January", () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
  });

  it("goes back one month within the year", () => {
    expect(previousMonth({ year: 2026, month: 10 })).toEqual({ year: 2026, month: 9 });
  });
});

describe("monthLongName", () => {
  it("returns the lowercase pt-BR name without the year", () => {
    expect(monthLongName({ year: 2026, month: 9 })).toBe("setembro");
  });

  it("handles December and January", () => {
    expect(monthLongName({ year: 2026, month: 12 })).toBe("dezembro");
    expect(monthLongName({ year: 2026, month: 1 })).toBe("janeiro");
  });
});
