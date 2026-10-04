import { describe, expect, it } from "vitest";
import { formatBRL, parseBRL } from "./money";

const normalize = (s: string) => s.replace(/\s/g, " ");

describe("parseBRL com allowZero", () => {
  it.each([["0"], ["0,00"]])("aceita %j como zero", (input) => {
    expect(parseBRL(input, { allowZero: true })).toEqual({ ok: true, value: 0 });
  });

  it("mantém valores positivos", () => {
    expect(parseBRL("1.234,56", { allowZero: true })).toEqual({ ok: true, value: 123456 });
  });

  it.each([["-5"], ["-0,01"], ["1.000.000.000,00"], [""], ["abc"]])("continua rejeitando %j", (input) => {
    const result = parseBRL(input, { allowZero: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("sem a opção, zero continua rejeitado", () => {
    expect(parseBRL("0,00").ok).toBe(false);
    expect(parseBRL("0", {}).ok).toBe(false);
  });
});

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
