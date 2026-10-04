import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, colorVar, isCategoryColor, nextFreeColor } from "./color";

describe("CATEGORY_COLORS", () => {
  it("has the 8 palette colors with the spec names, indexed 1..8", () => {
    expect(CATEGORY_COLORS).toEqual([
      { value: 1, name: "Azul" },
      { value: 2, name: "Laranja" },
      { value: 3, name: "Verde" },
      { value: 4, name: "Amarelo" },
      { value: 5, name: "Rosa" },
      { value: 6, name: "Verde-escuro" },
      { value: 7, name: "Roxo" },
      { value: 8, name: "Vermelho" },
    ]);
  });
});

describe("colorVar", () => {
  it.each([
    [1, "var(--viz-1)"],
    [7, "var(--viz-7)"],
    [8, "var(--viz-8)"],
  ])("renders color %i with the theme token %s", (color, token) => {
    expect(colorVar(color)).toBe(token);
  });
});

describe("isCategoryColor", () => {
  it.each([[1], [8]])("accepts %j", (value) => {
    expect(isCategoryColor(value)).toBe(true);
  });

  it.each([[0], [9], [1.5], ["1"], [null]])("rejects %j", (value) => {
    expect(isCategoryColor(value)).toBe(false);
  });
});

describe("nextFreeColor", () => {
  it.each([
    [[], 1],
    [[1, 2], 3],
    [[2], 1],
    [[1, 2, 3, 4, 5, 6, 7, 8], 1],
  ])("with %j in use picks %i", (used, color) => {
    expect(nextFreeColor(used)).toBe(color);
  });
});
