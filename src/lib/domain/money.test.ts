import { describe, expect, it } from "vitest";
import { formatBRL, parseBRL } from "./money";

const normalize = (s: string) => s.replace(/\s/g, " ");

describe("parseBRL", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["1234", 123400],
    ["0,01", 1],
    ["999.999.999,99", 99_999_999_999],
  ])("parses %s into %i cents", (input, cents) => {
    expect(parseBRL(input)).toEqual({ ok: true, value: cents });
  });

  it.each([
    ["0"],
    ["0,00"],
    ["-5"],
    ["abc"],
    ["1,234"],
    [""],
    ["1.000.000.000,00"],
  ])("rejects %j with a validation message", (input) => {
    const result = parseBRL(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("formatBRL", () => {
  it("formats cents as BRL currency", () => {
    expect(normalize(formatBRL(123456))).toBe("R$ 1.234,56");
  });

  it("formats zero as R$ 0,00", () => {
    expect(normalize(formatBRL(0))).toBe("R$ 0,00");
  });
});
