import { describe, expect, it } from "vitest";
import {
  adjustToTotal,
  defaultAdjustIndex,
  formatPercent,
  formatPercentFixed,
  formatShare,
  microFromCents,
  parsePercent,
  percentFieldText,
  resolveAdjustKey,
  sumLabel,
} from "./percent";

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

describe("adjustToTotal", () => {
  const P = 1_000_000;

  it("raises the row by what the sum lacks (6,297973 in 99,047973 → 7,25)", () => {
    expect(adjustToTotal(6_297_973, 99_047_973)).toEqual({ ok: true, value: 7.25 * P });
  });

  it("lowers the row by the excess (6,297973 in 100,297973 → 6)", () => {
    expect(adjustToTotal(6_297_973, 100_297_973)).toEqual({ ok: true, value: 6 * P });
  });

  it("fills an empty row (counted as 0) with what is missing", () => {
    expect(adjustToTotal(0, 99 * P)).toEqual({ ok: true, value: 1 * P });
  });

  it("rejects a result below 0,000001%", () => {
    const r = adjustToTotal(0.2 * P, 100_297_973);
    expect(r).toEqual({
      ok: false,
      error:
        "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%",
    });
  });

  it("rejects a result of exactly 0", () => {
    expect(adjustToTotal(P, 101 * P).ok).toBe(false);
  });

  it("rejects a result above 100%", () => {
    expect(adjustToTotal(60 * P, 10 * P).ok).toBe(false);
  });
});

describe("formatPercentFixed", () => {
  it.each([
    [6_303_138, "6,30"],
    [30_000_000, "30,00"],
    [4_999, "0,00"],
    [5_000, "0,01"],
  ])("formats %i micro-percent as %s", (micro, text) => {
    expect(formatPercentFixed(micro)).toBe(text);
  });
});

describe("percentFieldText", () => {
  it("shows 2 decimals while unfocused", () => {
    expect(percentFieldText("6,303138", false)).toBe("6,30");
  });

  it("shows the full text while focused", () => {
    expect(percentFieldText("6,303138", true)).toBe("6,303138");
  });

  it.each([[""], ["abc"]])("returns %j unchanged when empty or invalid", (text) => {
    expect(percentFieldText(text, false)).toBe(text);
  });
});

describe("sumLabel", () => {
  it.each([
    [100_005_248, "100,01%"],
    [99_999_999, "99,999999%"],
    [100_000_000, "100,00%"],
    [99_000_000, "99,00%"],
  ])("labels a sum of %i micro-percent as %s", (micro, text) => {
    expect(sumLabel(micro)).toBe(text);
  });
});

describe("defaultAdjustIndex", () => {
  it("picks the first of the largest valid percentages", () => {
    expect(defaultAdjustIndex([null, 10_000_000, 30_000_000, 30_000_000])).toBe(2);
  });

  it("returns null when no percentage is valid", () => {
    expect(defaultAdjustIndex([null])).toBeNull();
  });
});

describe("resolveAdjustKey", () => {
  const opts = [
    { key: "a", micro: 10_000_000 },
    { key: "b", micro: 30_000_000 },
    { key: "c", micro: 30_000_000 },
  ];

  it("keeps a chosen row that still exists", () => {
    expect(resolveAdjustKey("a", opts)).toBe("a");
  });

  it("falls back to the largest valid percentage when the chosen row was removed", () => {
    expect(resolveAdjustKey("gone", opts)).toBe("b");
  });

  it("uses the default when nothing was chosen yet", () => {
    expect(resolveAdjustKey(null, opts)).toBe("b");
  });

  it("keeps the same category when a row before it is removed", () => {
    const afterRemoval = opts.slice(1);
    expect(resolveAdjustKey("c", afterRemoval)).toBe("c");
  });

  it("falls back to the first row when no percentage is valid", () => {
    expect(resolveAdjustKey("gone", [{ key: "x", micro: null }, { key: "y", micro: null }])).toBe("x");
  });

  it("returns null without rows", () => {
    expect(resolveAdjustKey("a", [])).toBeNull();
  });
});
