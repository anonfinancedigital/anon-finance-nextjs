import { describe, expect, it } from "vitest";
import { formatBRL, formatCompactBRL, maskBRLInput, parseBRL, referenceIncomeText } from "./money";

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

describe("maskBRLInput", () => {
  it("preenche os centavos da direita para a esquerda a cada dígito", () => {
    const expected = ["0,01", "0,12", "1,23", "12,34", "123,45", "1.234,56"];
    let text = "";
    expected.forEach((want, i) => {
      text = maskBRLInput(text + String(i + 1));
      expect(text).toBe(want);
    });
  });

  it("ignora letras e símbolos", () => {
    expect(maskBRLInput("1a2")).toBe("0,12");
  });

  it("preserva o texto atual ao digitar um não dígito", () => {
    expect(maskBRLInput("1.234,56x")).toBe("1.234,56");
  });

  it.each([[""], ["abc"], ["0"], ["0,00"]])("retorna vazio para %j", (input) => {
    expect(maskBRLInput(input)).toBe("");
  });

  it("corta em 11 dígitos", () => {
    expect(maskBRLInput("999999999999")).toBe("999.999.999,99");
  });

  it("remove zeros à esquerda", () => {
    expect(maskBRLInput("0,05")).toBe("0,05");
    expect(maskBRLInput("000123")).toBe("1,23");
  });

  it.each([["1"], ["123456"], ["99999999999"], ["100000"]])("gera texto aceito por parseBRL para %j", (input) => {
    expect(parseBRL(maskBRLInput(input)).ok).toBe(true);
  });
});

describe("referenceIncomeText", () => {
  it.each([
    [500000, "5.000,00"], // REFINC-01
    [1, "0,01"],
    [99_999_999_999, "999.999.999,99"],
  ])("formata %d como %j", (cents, text) => {
    expect(referenceIncomeText(cents)).toBe(text);
    expect(parseBRL(text).ok).toBe(true);
  });

  it.each([[0], [-100], [100_000_000_000]])("devolve vazio para %d", (cents) => {
    expect(referenceIncomeText(cents)).toBe(""); // REFINC-03, REFINC-04
  });
});

describe("formatCompactBRL", () => {
  it.each([
    [37_500_000, "R$ 375 mil"],
    [112_500_000, "R$ 1,1 mi"],
    [150_000_000, "R$ 1,5 mi"],
  ])("%d centavos viram %j", (cents, expected) => {
    expect(normalize(formatCompactBRL(cents))).toBe(expected);
  });
});
