import { describe, expect, it } from "vitest";
import { z } from "zod";
import { transactionSchema } from "./transaction";

const ID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";
const CATEGORY_ID = "7d9e1f2a-3b4c-4d5e-8f6a-7b8c9d0e1f2a";

const expense = {
  id: ID,
  kind: "expense",
  amount: "1.234,56",
  date: "2026-10-04",
  categoryId: CATEGORY_ID,
  description: "Mercado",
};
const income = { id: ID, kind: "income", amount: "5.000", date: "2026-10-01" };

/** Keys of the fields that failed validation. */
function failedFields(input: unknown) {
  const result = transactionSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return Object.keys(z.flattenError(result.error).fieldErrors);
}

describe("transactionSchema", () => {
  it("accepts a valid expense and converts the amount to cents", () => {
    expect(transactionSchema.parse(expense)).toEqual({
      id: ID,
      kind: "expense",
      amountCents: 123456,
      date: "2026-10-04",
      categoryId: CATEGORY_ID,
      description: "Mercado",
      recurrence: "none",
      recurrenceEndMonth: null,
    });
  });

  it("accepts a valid income without category or description", () => {
    expect(transactionSchema.parse(income)).toEqual({
      id: ID,
      kind: "income",
      amountCents: 500000,
      date: "2026-10-01",
      description: null,
      recurrence: "none",
      recurrenceEndMonth: null,
    });
  });

  it("accepts a 120-character description", () => {
    const description = "a".repeat(120);
    expect(transactionSchema.parse({ ...expense, description }).description).toBe(description);
  });

  it.each([
    ["amount ≤ 0", { ...expense, amount: "0" }, "amount"],
    ["amount above the maximum", { ...expense, amount: "1.000.000.000,00" }, "amount"],
    ["empty date", { ...expense, date: "" }, "date"],
    ["Feb 29 of a non-leap year", { ...expense, date: "2025-02-29" }, "date"],
    ["expense without category", { ...expense, categoryId: undefined }, "categoryId"],
    ["121-character description", { ...expense, description: "a".repeat(121) }, "description"],
    ["id that is not a UUID", { ...expense, id: "abc" }, "id"],
    ["income with a category", { ...income, categoryId: CATEGORY_ID }, "categoryId"],
  ])("rejects %s with an error on that field only", (_label, input, field) => {
    expect(failedFields(input)).toEqual([field]);
  });
});

describe("transactionSchema subcategoryId", () => {
  const SUBCATEGORY_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

  it("accepts an expense with a subcategory uuid", () => {
    expect(
      transactionSchema.parse({ ...expense, subcategoryId: SUBCATEGORY_ID }).subcategoryId,
    ).toBe(SUBCATEGORY_ID);
  });

  it("accepts an expense without the field as having no subcategory", () => {
    expect(transactionSchema.parse(expense).subcategoryId).toBeUndefined();
  });

  it("accepts an expense with an empty subcategory as having no subcategory", () => {
    expect(transactionSchema.parse({ ...expense, subcategoryId: "" }).subcategoryId).toBeUndefined();
  });

  it("rejects an expense subcategory that is not a uuid, on that field only", () => {
    expect(failedFields({ ...expense, subcategoryId: "abc" })).toEqual(["subcategoryId"]);
  });

  it("rejects an income with a subcategory with 'Ganho não tem subcategoria'", () => {
    const result = transactionSchema.safeParse({ ...income, subcategoryId: SUBCATEGORY_ID });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(z.flattenError(result.error).fieldErrors).toEqual({
      subcategoryId: ["Ganho não tem subcategoria"],
    });
  });
});

describe("transactionSchema recurrence", () => {
  /** Field errors of a failed parse. */
  function fieldErrors(input: unknown) {
    const result = transactionSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return {};
    return z.flattenError(result.error).fieldErrors;
  }

  it("defaults to not recurring when recurrence is not sent", () => {
    const parsed = transactionSchema.parse(expense);
    expect(parsed.recurrence).toBe("none");
    expect(parsed.recurrenceEndMonth).toBeNull();
  });

  it("accepts a recurring expense forever", () => {
    expect(transactionSchema.parse({ ...expense, recurrence: "forever" })).toMatchObject({
      kind: "expense",
      recurrence: "forever",
      recurrenceEndMonth: null,
    });
  });

  it("accepts a recurring income until a final month", () => {
    const parsed = transactionSchema.parse({
      ...income,
      recurrence: "until",
      recurrenceEnd: "2027-03",
    });
    expect(parsed).toMatchObject({
      kind: "income",
      recurrence: "until",
      recurrenceEndMonth: "2027-03",
    });
  });

  it("rejects 'until' without a final month on recurrenceEnd only, with 'Informe o mês final'", () => {
    expect(fieldErrors({ ...expense, recurrence: "until" })).toEqual({
      recurrenceEnd: ["Informe o mês final"],
    });
    expect(fieldErrors({ ...expense, recurrence: "until", recurrenceEnd: "" })).toEqual({
      recurrenceEnd: ["Informe o mês final"],
    });
  });

  it("rejects a final month before the month of the date", () => {
    expect(fieldErrors({ ...expense, recurrence: "until", recurrenceEnd: "2026-09" })).toEqual({
      recurrenceEnd: ["O mês final deve ser igual ou posterior ao mês do lançamento"],
    });
  });

  it("accepts a final month equal to the month of the date", () => {
    expect(
      transactionSchema.parse({ ...expense, recurrence: "until", recurrenceEnd: "2026-10" })
        .recurrenceEndMonth,
    ).toBe("2026-10");
  });

  it.each([["2026-13"], ["1999-12"], ["2101-01"], ["dezembro"], ["2026-1"], ["2026-00"]])(
    "rejects the final month %s with 'Mês final inválido'",
    (recurrenceEnd) => {
      expect(fieldErrors({ ...expense, recurrence: "until", recurrenceEnd })).toEqual({
        recurrenceEnd: ["Mês final inválido"],
      });
    },
  );

  it("accepts the final month bounds 2100-12", () => {
    expect(
      transactionSchema.parse({ ...expense, recurrence: "until", recurrenceEnd: "2100-12" })
        .recurrenceEndMonth,
    ).toBe("2100-12");
  });

  it.each([["none"], ["forever"]])(
    "ignores a final month sent with '%s' and stores none",
    (recurrence) => {
      const parsed = transactionSchema.parse({ ...expense, recurrence, recurrenceEnd: "2026-09" });
      expect(parsed.recurrence).toBe(recurrence);
      expect(parsed.recurrenceEndMonth).toBeNull();
    },
  );

  it("rejects an unknown recurrence option on that field only", () => {
    expect(failedFields({ ...expense, recurrence: "weekly" })).toEqual(["recurrence"]);
  });
});
