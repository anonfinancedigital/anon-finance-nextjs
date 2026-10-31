import { describe, expect, it } from "vitest";
import { netByDay } from "./day-total";

describe("netByDay", () => {
  it("sums the day's gastos as a negative net", () => {
    const totals = netByDay([
      { date: "2026-10-28", kind: "expense", amountCents: 3_324 },
      { date: "2026-10-28", kind: "expense", amountCents: 5_328 },
      { date: "2026-10-27", kind: "expense", amountCents: 5_760 },
    ]);
    expect(totals.get("2026-10-28")).toBe(-8_652);
    expect(totals.get("2026-10-27")).toBe(-5_760);
  });

  it("counts receitas as positive and nets them against gastos", () => {
    const totals = netByDay([
      { date: "2026-10-05", kind: "income", amountCents: 100_000 },
      { date: "2026-10-05", kind: "expense", amountCents: 40_000 },
    ]);
    expect(totals.get("2026-10-05")).toBe(60_000);
  });

  it("has no entry for a day without transactions", () => {
    expect(netByDay([]).size).toBe(0);
    expect(netByDay([{ date: "2026-10-05", kind: "expense", amountCents: 1 }]).has("2026-10-06")).toBe(false);
  });
});
