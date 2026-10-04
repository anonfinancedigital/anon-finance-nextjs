import { describe, expect, it } from "vitest";
import { validateCategorySet } from "./budget";

const cats = (...bps: number[]) => bps.map((bp, i) => ({ name: `Categoria ${i + 1}`, bp }));

describe("validateCategorySet", () => {
  it("accepts a set that sums to 100% (30/30/10/10/20)", () => {
    expect(validateCategorySet(cats(3000, 3000, 1000, 1000, 2000))).toEqual({ ok: true });
  });

  it("rejects a set summing 105% with the spec message", () => {
    const result = validateCategorySet(cats(3000, 3000, 1000, 1000, 2000, 500));
    expect(result).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 105%)",
    });
  });

  it("rejects an empty set with (atual: 0%)", () => {
    expect(validateCategorySet([])).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 0%)",
    });
  });

  it("shows fractional sums with up to 2 decimals in the message", () => {
    expect(validateCategorySet(cats(3333, 3333, 3333))).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 99,99%)",
    });
  });

  it("rejects an empty name with an error on that field", () => {
    const result = validateCategorySet([
      { name: "  ", bp: 5000 },
      { name: "Lazer", bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["0.name"]);
    expect(result.fieldErrors?.["0.name"]).toEqual(expect.any(String));
  });

  it("rejects a 41-character name with an error on that field", () => {
    const result = validateCategorySet([
      { name: "Lazer", bp: 5000 },
      { name: "a".repeat(41), bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["1.name"]);
  });

  it("accepts a 40-character name", () => {
    expect(
      validateCategorySet([
        { name: "a".repeat(40), bp: 5000 },
        { name: "Lazer", bp: 5000 },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects case-insensitive duplicate names (Lazer/lazer) on the repeated field", () => {
    const result = validateCategorySet([
      { name: "Lazer", bp: 5000 },
      { name: "lazer", bp: 5000 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["1.name"]);
  });
});
