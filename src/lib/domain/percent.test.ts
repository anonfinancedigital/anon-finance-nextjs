import { describe, expect, it } from "vitest";
import { formatPercent, formatShare, parsePercent } from "./percent";

describe("parsePercent", () => {
  it.each([
    ["30", 3000],
    ["12,5", 1250],
    ["0,01", 1],
    ["100", 10000],
  ])("parses %s into %i basis points", (input, bp) => {
    expect(parsePercent(input)).toEqual({ ok: true, value: bp });
  });

  it.each([["0"], ["0,001"], ["100,01"], ["-1"], ["abc"], [""]])(
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
    [1250, "12,5%"],
    [3000, "30%"],
  ])("formats %i bp as %s", (bp, text) => {
    expect(formatPercent(bp)).toBe(text);
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
