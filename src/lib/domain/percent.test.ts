import { describe, expect, it } from "vitest";
import { formatPercent, formatShare, microFromCents, parsePercent } from "./percent";

describe("parsePercent", () => {
  it.each([
    ["30", 30_000_000],
    ["12,5", 12_500_000],
    ["0,01", 10_000],
    ["6,666667", 6_666_667],
    ["0,000001", 1],
    ["100", 100_000_000],
  ])("parses %s into %i micro-percent", (input, micro) => {
    expect(parsePercent(input)).toEqual({ ok: true, value: micro });
  });

  it.each([["0"], ["0,0000001"], ["100,000001"], ["-1"], ["abc"], [""]])(
    "rejects %j with a validation message",
    (input) => {
      const result = parsePercent(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    },
  );
});

describe("formatPercent", () => {
  it.each([
    [12_500_000, "12,5%"],
    [30_000_000, "30%"],
    [6_666_667, "6,666667%"],
    [1, "0,000001%"],
  ])("formats %i micro-percent as %s", (micro, text) => {
    expect(formatPercent(micro)).toBe(text);
  });
});

describe("formatShare", () => {
  it.each([
    [6250, "62,5%"],
    [2000, "20,0%"],
    [0, "0,0%"],
    [10000, "100,0%"],
    [3333, "33,3%"],
  ])("formats %i bp as %s", (bp, text) => {
    expect(formatShare(bp)).toBe(text);
  });
});

describe("microFromCents", () => {
  it.each([
    [50000, 500000, 10_000_000],
    [33333, 500000, 6_666_600],
    [500, 500000, 100_000],
    [500000, 500000, 100_000_000],
  ])("converts %i cents of %i into %i micro-percent", (cents, income, micro) => {
    expect(microFromCents(cents, income)).toEqual({ ok: true, value: micro });
  });

  it("round-trips a typed amount exactly: R$ 333,33 of R$ 5.000,00 → 6,6666% → 33333 cents", () => {
    const result = microFromCents(33333, 500000);
    expect(result).toEqual({ ok: true, value: 6_666_600 });
  });

  it.each([
    [0, 500000],
    [500001 * 2, 500000],
    [1, 100_000_000_000],
  ])("rejects %i cents of %i as out of range", (cents, income) => {
    const result = microFromCents(cents, income);
    expect(result).toEqual({ ok: false, error: "O percentual deve estar entre 0,000001 e 100" });
  });
});
