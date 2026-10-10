import { describe, expect, it } from "vitest";
import type { ImportPayload } from "@/lib/vault/types";
import { sealedImportSchema } from "./import-sealed";

const CT = "v1:AAAAAAAAAAAAAAAAAAAAAAAA";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CAT_A = uuid(1);
const CAT_B = uuid(2);
const SUB_A1 = uuid(11);
const SUB_B1 = uuid(12);

const tx = (n: number, patch: Partial<ImportPayload["transactions"][number]> = {}): ImportPayload["transactions"][number] => ({
  id: uuid(1000 + n),
  kind: "expense",
  date: "2026-10-05",
  categoryId: CAT_A,
  subcategoryId: SUB_A1,
  amountCt: CT,
  descriptionCt: CT,
  recurring: false,
  recurrenceDay: null,
  recurrenceEnd: null,
  seriesId: null,
  ...patch,
});

function payload(): ImportPayload {
  return {
    categories: [
      { id: CAT_A, color: 3, isInvestment: false, deletedFrom: null, nameCt: CT, versions: [{ fromMonth: "0001-01-01", percentCt: CT }, { fromMonth: "2026-09-01", percentCt: CT }], subcategories: [{ id: SUB_A1, nameCt: CT }] },
      { id: CAT_B, color: 7, isInvestment: true, deletedFrom: "2026-10-01", nameCt: CT, versions: [{ fromMonth: "0001-01-01", percentCt: CT }], subcategories: [{ id: SUB_B1, nameCt: CT }] },
    ],
    transactions: [
      tx(1),
      tx(2, { kind: "income", categoryId: null, subcategoryId: null, descriptionCt: null, recurring: true, recurrenceDay: 5, recurrenceEnd: "2026-12-01", seriesId: uuid(1002) }),
    ],
    goal: { monthlyIncomeCt: CT, savedCt: CT, retirementAgeCt: CT, annualRateCt: CT, withdrawalRateCt: CT },
    birthDateCt: CT,
  };
}

const ok = (p: unknown) => sealedImportSchema.safeParse(p).success;
const mutated = (mutate: (p: ImportPayload) => void) => {
  const p = payload();
  mutate(p);
  return p;
};

describe("sealedImportSchema (IMPORT-03)", () => {
  it("accepts a well-formed payload and keeps its content", () => {
    const p = payload();
    expect(sealedImportSchema.parse(p)).toEqual(p);
  });

  it("accepts an empty payload with null goal and birth date", () => {
    expect(ok({ categories: [], transactions: [], goal: null, birthDateCt: null })).toBe(true);
  });

  it("rejects a payload with a missing key or that is not an object", () => {
    const withoutGoal: Partial<ImportPayload> = payload();
    delete withoutGoal.goal;
    expect(ok(withoutGoal)).toBe(false);
    expect(ok(null)).toBe(false);
  });

  it("rejects ids that are not UUIDs", () => {
    expect(ok(mutated((p) => (p.transactions[0].id = "t1")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].id = "c1")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].subcategories[0].id = "s1")))).toBe(false);
  });

  it("rejects ciphertexts that are not v1:<base64url> or exceed 2048 characters", () => {
    expect(ok(mutated((p) => (p.transactions[0].amountCt = "15000")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].nameCt = "v1:a b")))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].amountCt = `v1:${"A".repeat(2046)}`)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].amountCt = `v1:${"A".repeat(2045)}`)))).toBe(true);
    expect(ok(mutated((p) => (p.goal!.savedCt = "plain")))).toBe(false);
    expect(ok(mutated((p) => (p.birthDateCt = "1990-03-15")))).toBe(false);
  });

  it("rejects dates that do not exist and percent months that are not the first of a month", () => {
    expect(ok(mutated((p) => (p.transactions[0].date = "2026-02-30")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[1].deletedFrom = "2026-13-01")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].versions[1].fromMonth = "2026-09-15")))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].versions[1].fromMonth = "2026-09-01")))).toBe(true);
  });

  it("accepts colors 1 and 8 and rejects 0 and 9", () => {
    for (const color of [1, 8]) expect(ok(mutated((p) => (p.categories[0].color = color)))).toBe(true);
    for (const color of [0, 9]) expect(ok(mutated((p) => (p.categories[0].color = color)))).toBe(false);
  });
});

describe("references and rows (IMPORT-11)", () => {
  it("rejects an expense without category or with a category absent from the payload", () => {
    expect(ok(mutated((p) => (p.transactions[0].categoryId = null)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].categoryId = uuid(99))))).toBe(false);
  });

  it("rejects a subcategory absent from the payload or owned by another category", () => {
    expect(ok(mutated((p) => (p.transactions[0].subcategoryId = uuid(98))))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].subcategoryId = SUB_B1)))).toBe(false);
  });

  it("accepts an expense without subcategory", () => {
    expect(ok(mutated((p) => (p.transactions[0].subcategoryId = null)))).toBe(true);
  });

  it("rejects an income with a category or a subcategory", () => {
    expect(ok(mutated((p) => (p.transactions[1].categoryId = CAT_A)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[1].subcategoryId = SUB_A1)))).toBe(false);
  });

  it("rejects repeated ids of transactions, categories and subcategories, and repeated percent months", () => {
    expect(ok(mutated((p) => (p.transactions[1].id = p.transactions[0].id)))).toBe(false);
    expect(ok(mutated((p) => (p.categories[1].id = CAT_A)))).toBe(false);
    expect(ok(mutated((p) => (p.categories[1].subcategories[0].id = SUB_A1)))).toBe(false);
    expect(ok(mutated((p) => (p.categories[0].versions[1].fromMonth = "0001-01-01")))).toBe(false);
  });

  it("accepts a seriesId that is not the id of any transaction (first segment absent from the file)", () => {
    expect(ok(mutated((p) => (p.transactions[1].seriesId = uuid(77))))).toBe(true);
  });
});

describe("recurrence", () => {
  it("rejects recurring without day or series, and a day or series without recurring", () => {
    expect(ok(mutated((p) => (p.transactions[1].recurrenceDay = null)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[1].seriesId = null)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].recurrenceDay = 5)))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].seriesId = uuid(5))))).toBe(false);
  });

  it("accepts days 1 and 31 and rejects 0 and 32", () => {
    for (const day of [1, 31]) expect(ok(mutated((p) => (p.transactions[1].recurrenceDay = day)))).toBe(true);
    for (const day of [0, 32]) expect(ok(mutated((p) => (p.transactions[1].recurrenceDay = day)))).toBe(false);
  });

  it("rejects an end before the month of the date or on a non-recurring row; accepts the same month", () => {
    expect(ok(mutated((p) => (p.transactions[1].recurrenceEnd = "2026-07-01")))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[0].recurrenceEnd = "2026-12-01")))).toBe(false);
    expect(ok(mutated((p) => (p.transactions[1].recurrenceEnd = "2026-10-01")))).toBe(true);
  });
});

describe("quantity limits (IMPORT-13)", () => {
  const income = (n: number) => tx(n, { kind: "income", categoryId: null, subcategoryId: null });
  const category = (n: number): ImportPayload["categories"][number] => ({
    id: uuid(5000 + n),
    color: 1,
    isInvestment: false,
    deletedFrom: null,
    nameCt: CT,
    versions: [],
    subcategories: [],
  });

  it("accepts 15.000 transactions and rejects 15.001", () => {
    const build = (n: number) => ({ categories: [], transactions: Array.from({ length: n }, (_, i) => income(i)), goal: null, birthDateCt: null });
    expect(ok(build(15_000))).toBe(true);
    expect(ok(build(15_001))).toBe(false);
  });

  it("accepts 1.000 categories and rejects 1.001", () => {
    const build = (n: number) => ({ categories: Array.from({ length: n }, (_, i) => category(i)), transactions: [], goal: null, birthDateCt: null });
    expect(ok(build(1_000))).toBe(true);
    expect(ok(build(1_001))).toBe(false);
  });

  it("accepts 100 percent versions in a category and rejects 101", () => {
    const versions = (n: number) => Array.from({ length: n }, (_, i) => ({ fromMonth: `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, percentCt: CT }));
    expect(ok(mutated((p) => (p.categories[0].versions = versions(100))))).toBe(true);
    expect(ok(mutated((p) => (p.categories[0].versions = versions(101))))).toBe(false);
  });

  it("accepts 30 subcategories in a category and rejects 31", () => {
    const subs = (n: number) => [{ id: SUB_A1, nameCt: CT }, ...Array.from({ length: n - 1 }, (_, i) => ({ id: uuid(7000 + i), nameCt: CT }))];
    expect(ok(mutated((p) => (p.categories[0].subcategories = subs(30))))).toBe(true);
    expect(ok(mutated((p) => (p.categories[0].subcategories = subs(31))))).toBe(false);
  });
});
