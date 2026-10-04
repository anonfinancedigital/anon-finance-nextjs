import { describe, expect, it } from "vitest";
import {
  addSubcategoryLabel,
  categoryDisplayName,
  categoryInitial,
  pickSelection,
  subcategoryCountLabel,
} from "./category-label";

describe("subcategoryCountLabel", () => {
  it("uses the singular only for one", () => {
    expect(subcategoryCountLabel(0)).toBe("0 subcategorias");
    expect(subcategoryCountLabel(1)).toBe("1 subcategoria");
    expect(subcategoryCountLabel(2)).toBe("2 subcategorias");
    expect(subcategoryCountLabel(30)).toBe("30 subcategorias");
  });
});

describe("categoryDisplayName", () => {
  it("trims the name", () => {
    expect(categoryDisplayName("  Lazer ")).toBe("Lazer");
  });

  it("falls back to 'Nova categoria' for an empty or blank name", () => {
    expect(categoryDisplayName("")).toBe("Nova categoria");
    expect(categoryDisplayName("   ")).toBe("Nova categoria");
  });
});

describe("categoryInitial", () => {
  it("is the uppercase first letter of the displayed name", () => {
    expect(categoryInitial("lazer")).toBe("L");
    expect(categoryInitial("  taxas")).toBe("T");
  });

  it("uses the fallback name when empty", () => {
    expect(categoryInitial("")).toBe("N");
  });
});

describe("addSubcategoryLabel", () => {
  it("names the category", () => {
    expect(addSubcategoryLabel("Lazer")).toBe("Nova subcategoria em Lazer");
  });

  it("uses the fallback name when the category name is empty", () => {
    expect(addSubcategoryLabel("")).toBe("Nova subcategoria em Nova categoria");
  });
});

describe("pickSelection", () => {
  it("leaves the subcategory empty when none is given", () => {
    expect(pickSelection("c1")).toEqual({ categoryId: "c1", subcategoryId: "" });
  });

  it("returns both ids when a subcategory is given", () => {
    expect(pickSelection("c1", "s1")).toEqual({ categoryId: "c1", subcategoryId: "s1" });
  });
});
