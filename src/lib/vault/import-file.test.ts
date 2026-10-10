import { describe, expect, it } from "vitest";
import { buildExport, type OpenedExport } from "./export";
import {
  checkImportFileSize,
  IMPORT_INVALID,
  IMPORT_TOO_LARGE,
  MAX_IMPORT_FILE_BYTES,
  parseImportFile,
} from "./import-file";

const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const SUB_B1 = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";

/** Export of a full account: expense with subcategory, recurring income series, a deleted category, goal, birth date. */
function fullExport(): OpenedExport {
  return {
    transactions: [
      {
        id: "t1",
        kind: "expense",
        date: "2026-10-05",
        categoryId: CAT_A,
        subcategoryId: SUB_A1,
        amountCents: 15000,
        description: "Mercado",
        recurring: false,
        recurrenceDay: null,
        recurrenceEnd: null,
        seriesId: null,
      },
      {
        id: "t2",
        kind: "income",
        date: "2026-08-05",
        categoryId: null,
        subcategoryId: null,
        amountCents: 500000,
        description: null,
        recurring: true,
        recurrenceDay: 5,
        recurrenceEnd: "2026-12-01",
        seriesId: "t2",
      },
      {
        id: "t3",
        kind: "income",
        date: "2027-01-05",
        categoryId: null,
        subcategoryId: null,
        amountCents: 600000,
        description: null,
        recurring: true,
        recurrenceDay: 5,
        recurrenceEnd: null,
        seriesId: "t2",
      },
    ],
    categories: [
      {
        id: CAT_A,
        name: "Moradia",
        color: 3,
        isInvestment: false,
        deletedFrom: null,
        percentVersions: [
          { fromMonth: "0001-01-01", percentMicro: 30_000_000 },
          { fromMonth: "2026-09-01", percentMicro: 35_000_000 },
        ],
        subcategories: [{ id: SUB_A1, name: "Aluguel" }],
      },
      {
        id: CAT_B,
        name: "Lazer",
        color: 7,
        isInvestment: true,
        deletedFrom: "2026-10-01",
        percentVersions: [{ fromMonth: "0001-01-01", percentMicro: 10_000_000 }],
        subcategories: [{ id: SUB_B1, name: "Cinema" }],
      },
    ],
    goal: { monthlyIncomeCents: 1_500_000, savedCents: 25_000_000, retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 400 },
    birthDate: "1990-03-15",
  };
}

/** Parses a mutated copy of the full export. */
function parseWith(mutate: (data: OpenedExport) => void) {
  const data = fullExport();
  mutate(data);
  return parseImportFile(buildExport(data));
}

const INVALID = { ok: false, error: IMPORT_INVALID };

describe("messages", () => {
  it("uses the exact texts of the spec", () => {
    expect(IMPORT_INVALID).toBe("Arquivo inválido. Use o arquivo exportado pelo Orçamento.");
    expect(IMPORT_TOO_LARGE).toBe("Arquivo muito grande (máximo 20 MB)");
  });
});

describe("checkImportFileSize (IMPORT-08)", () => {
  it("accepts a file of exactly 20 MB", () => {
    expect(MAX_IMPORT_FILE_BYTES).toBe(20 * 1024 * 1024);
    expect(checkImportFileSize(MAX_IMPORT_FILE_BYTES)).toBeNull();
  });

  it("refuses one byte above 20 MB with the exact message", () => {
    expect(checkImportFileSize(MAX_IMPORT_FILE_BYTES + 1)).toBe("Arquivo muito grande (máximo 20 MB)");
  });
});

describe("parseImportFile with a valid file", () => {
  it("round-trips buildExport and counts transactions, categories and subcategories", () => {
    const data = fullExport();
    const result = parseImportFile(buildExport(data));
    expect(result).toEqual({
      ok: true,
      data,
      summary: { transactions: 3, categories: 2, subcategories: 2 },
    });
  });

  it("accepts an export without data: empty lists, null goal, birth date (IMPORT-29)", () => {
    const empty: OpenedExport = { transactions: [], categories: [], goal: null, birthDate: "1990-03-15" };
    expect(parseImportFile(buildExport(empty))).toEqual({
      ok: true,
      data: empty,
      summary: { transactions: 0, categories: 0, subcategories: 0 },
    });
  });

  it("accepts a null birth date", () => {
    const result = parseWith((d) => {
      d.birthDate = null;
    });
    expect(result.ok).toBe(true);
  });

  it("keeps a deleted category and an active one with the same name, ignoring case (IMPORT-31)", () => {
    const result = parseWith((d) => {
      d.categories[1].name = "MORADIA";
    });
    expect(result.ok).toBe(true);
  });

  it("does not require the percentages to sum 100%", () => {
    const result = parseWith((d) => {
      d.categories[0].percentVersions = [{ fromMonth: "0001-01-01", percentMicro: 1 }];
    });
    expect(result.ok).toBe(true);
  });

  it("keeps the segments of a series and the deleted category untouched (IMPORT-30, IMPORT-32)", () => {
    const result = parseImportFile(buildExport(fullExport()));
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.transactions.map((t) => t.seriesId)).toEqual([null, "t2", "t2"]);
    expect(result.data.categories[1].deletedFrom).toBe("2026-10-01");
  });
});

describe("structure (IMPORT-09)", () => {
  it("rejects text that is not JSON", () => {
    expect(parseImportFile("isto não é json")).toEqual(INVALID);
  });

  it.each(["transactions", "categories", "goal", "birthDate"] as const)("rejects a file without `%s`", (key) => {
    const raw = JSON.parse(buildExport(fullExport()));
    delete raw[key];
    expect(parseImportFile(JSON.stringify(raw))).toEqual(INVALID);
  });

  it.each([
    ["transactions", "x"],
    ["categories", {}],
    ["goal", "x"],
    ["birthDate", 1990],
  ])("rejects `%s` with the wrong type", (key, value) => {
    const raw = JSON.parse(buildExport(fullExport()));
    raw[key] = value;
    expect(parseImportFile(JSON.stringify(raw))).toEqual(INVALID);
  });

  it("rejects a JSON that is not an object", () => {
    expect(parseImportFile("[]")).toEqual(INVALID);
    expect(parseImportFile("null")).toEqual(INVALID);
  });
});

describe("content rules (IMPORT-10)", () => {
  it("accepts the boundary amounts 1 and 99.999.999.999 and rejects 0 and 100.000.000.000", () => {
    for (const cents of [1, 99_999_999_999]) {
      expect(parseWith((d) => (d.transactions[0].amountCents = cents)).ok).toBe(true);
    }
    for (const cents of [0, 100_000_000_000, -1, 1.5]) {
      expect(parseWith((d) => (d.transactions[0].amountCents = cents))).toEqual(INVALID);
    }
  });

  it("accepts a description of 120 characters and rejects 121, empty and a non-string", () => {
    expect(parseWith((d) => (d.transactions[0].description = "a".repeat(120))).ok).toBe(true);
    expect(parseWith((d) => (d.transactions[0].description = "a".repeat(121)))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[0].description = ""))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[0].description = 5 as unknown as string))).toEqual(INVALID);
  });

  it("rejects an unknown kind", () => {
    expect(parseWith((d) => (d.transactions[0].kind = "transfer" as "income"))).toEqual(INVALID);
  });

  it("rejects a date that does not exist and accepts a leap day", () => {
    expect(parseWith((d) => (d.transactions[0].date = "2026-02-30"))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[0].date = "2028-02-29")).ok).toBe(true);
    expect(parseWith((d) => (d.transactions[0].date = "05/10/2026"))).toEqual(INVALID);
  });

  it("accepts a category name of 40 characters and rejects 41 and empty", () => {
    expect(parseWith((d) => (d.categories[0].name = "a".repeat(40))).ok).toBe(true);
    expect(parseWith((d) => (d.categories[0].name = "a".repeat(41)))).toEqual(INVALID);
    expect(parseWith((d) => (d.categories[0].name = ""))).toEqual(INVALID);
  });

  it("accepts a subcategory name of 40 characters and rejects 41", () => {
    expect(parseWith((d) => (d.categories[0].subcategories[0].name = "a".repeat(40))).ok).toBe(true);
    expect(parseWith((d) => (d.categories[0].subcategories[0].name = "a".repeat(41)))).toEqual(INVALID);
  });

  it("accepts colors 1 and 8 and rejects 0, 9 and 2.5", () => {
    for (const color of [1, 8]) expect(parseWith((d) => (d.categories[0].color = color)).ok).toBe(true);
    for (const color of [0, 9, 2.5]) expect(parseWith((d) => (d.categories[0].color = color))).toEqual(INVALID);
  });

  it("accepts percentages 1 and 100.000.000 micro and rejects 0 and 100.000.001", () => {
    const set = (micro: number) => (d: OpenedExport) => (d.categories[0].percentVersions[0].percentMicro = micro);
    expect(parseWith(set(1)).ok).toBe(true);
    expect(parseWith(set(100_000_000)).ok).toBe(true);
    expect(parseWith(set(0))).toEqual(INVALID);
    expect(parseWith(set(100_000_001))).toEqual(INVALID);
  });

  it("rejects a percent version that does not start on day 1 or does not exist", () => {
    expect(parseWith((d) => (d.categories[0].percentVersions[1].fromMonth = "2026-09-15"))).toEqual(INVALID);
    expect(parseWith((d) => (d.categories[0].percentVersions[1].fromMonth = "2026-13-01"))).toEqual(INVALID);
  });

  it("rejects a non-boolean isInvestment", () => {
    expect(parseWith((d) => (d.categories[0].isInvestment = "sim" as unknown as boolean))).toEqual(INVALID);
  });

  it("rejects an invalid birth date", () => {
    expect(parseWith((d) => (d.birthDate = "1990-02-31"))).toEqual(INVALID);
  });

  it("rejects duplicate ids of transactions, categories, subcategories and percent months", () => {
    expect(parseWith((d) => (d.transactions[1].id = "t1"))).toEqual(INVALID);
    expect(parseWith((d) => (d.categories[1].id = CAT_A))).toEqual(INVALID);
    expect(parseWith((d) => (d.categories[1].subcategories[0].id = SUB_A1))).toEqual(INVALID);
    expect(parseWith((d) => d.categories[0].percentVersions.push({ fromMonth: "2026-09-01", percentMicro: 1 }))).toEqual(INVALID);
  });

  it("rejects an inconsistent recurrence (day, series and recurring must come together)", () => {
    expect(parseWith((d) => (d.transactions[0].recurrenceDay = 5))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[0].seriesId = "x"))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].seriesId = null))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceDay = null))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceDay = 32))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceDay = 0))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceDay = 31)).ok).toBe(true);
  });

  it("rejects a recurrenceEnd on a non-recurring row or before the month of the date", () => {
    expect(parseWith((d) => (d.transactions[0].recurrenceEnd = "2026-12-01"))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceEnd = "2026-07-01"))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].recurrenceEnd = "2026-08-01")).ok).toBe(true);
  });

  describe("goal", () => {
    const withGoal = (patch: Partial<NonNullable<OpenedExport["goal"]>>) => (d: OpenedExport) => {
      d.goal = { ...d.goal!, ...patch };
    };

    it("accepts the boundary values", () => {
      expect(parseWith(withGoal({ monthlyIncomeCents: 100_000_000 })).ok).toBe(true);
      expect(parseWith(withGoal({ monthlyIncomeCents: 1 })).ok).toBe(true);
      expect(parseWith(withGoal({ savedCents: 0 })).ok).toBe(true);
      expect(parseWith(withGoal({ retirementAge: 1 })).ok).toBe(true);
      expect(parseWith(withGoal({ retirementAge: 120 })).ok).toBe(true);
      expect(parseWith(withGoal({ annualRateBp: 100, withdrawalRateBp: 100 })).ok).toBe(true);
      expect(parseWith(withGoal({ annualRateBp: 1500, withdrawalRateBp: 1500 })).ok).toBe(true);
    });

    it("rejects values outside the limits of the goal form", () => {
      expect(parseWith(withGoal({ monthlyIncomeCents: 100_000_001 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ monthlyIncomeCents: 0 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ savedCents: -1 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ savedCents: 100_000_000_000 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ retirementAge: 0 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ retirementAge: 121 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ annualRateBp: 99, withdrawalRateBp: 99 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ annualRateBp: 1501 }))).toEqual(INVALID);
      expect(parseWith(withGoal({ annualRateBp: 800, withdrawalRateBp: 801 }))).toEqual(INVALID);
    });

    it("rejects a goal with a missing field", () => {
      const raw = JSON.parse(buildExport(fullExport()));
      delete raw.goal.savedCents;
      expect(parseImportFile(JSON.stringify(raw))).toEqual(INVALID);
    });
  });
});

describe("references (IMPORT-11)", () => {
  it("rejects an expense that points to a category missing from the file", () => {
    expect(parseWith((d) => (d.transactions[0].categoryId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"))).toEqual(INVALID);
  });

  it("rejects an expense without a category", () => {
    expect(parseWith((d) => (d.transactions[0].categoryId = null))).toEqual(INVALID);
  });

  it("rejects an expense whose subcategory is missing from the file or belongs to another category", () => {
    expect(parseWith((d) => (d.transactions[0].subcategoryId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[0].subcategoryId = SUB_B1))).toEqual(INVALID);
  });

  it("accepts an expense without a subcategory", () => {
    expect(parseWith((d) => (d.transactions[0].subcategoryId = null)).ok).toBe(true);
  });

  it("rejects an income with a category or a subcategory", () => {
    expect(parseWith((d) => (d.transactions[1].categoryId = CAT_A))).toEqual(INVALID);
    expect(parseWith((d) => (d.transactions[1].subcategoryId = SUB_A1))).toEqual(INVALID);
  });
});

describe("unique names (IMPORT-12)", () => {
  it("rejects two active categories with the same name, ignoring case", () => {
    expect(
      parseWith((d) => {
        d.categories[1].deletedFrom = null;
        d.categories[1].name = "moradia";
      }),
    ).toEqual(INVALID);
  });

  it("rejects two subcategories with the same name in one category, ignoring case", () => {
    expect(
      parseWith((d) => d.categories[0].subcategories.push({ id: "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1", name: "ALUGUEL" })),
    ).toEqual(INVALID);
  });

  it("accepts the same subcategory name in different categories", () => {
    expect(parseWith((d) => (d.categories[1].subcategories[0].name = "aluguel")).ok).toBe(true);
  });

  it("accepts two deleted categories with the same name (only active names are unique)", () => {
    const result = parseWith((d) => {
      d.categories[0].deletedFrom = "2026-10-01";
      d.categories[1].name = "Moradia";
    });
    expect(result.ok).toBe(true);
  });
});

describe("quantity limits (IMPORT-13)", () => {
  const tx = (i: number): OpenedExport["transactions"][number] => ({
    id: `tx-${i}`,
    kind: "income",
    date: "2026-10-05",
    categoryId: null,
    subcategoryId: null,
    amountCents: 100,
    description: null,
    recurring: false,
    recurrenceDay: null,
    recurrenceEnd: null,
    seriesId: null,
  });

  it("accepts 15.000 transactions and rejects 15.001", () => {
    const build = (n: number) => ({ transactions: Array.from({ length: n }, (_, i) => tx(i)), categories: [], goal: null, birthDate: null });
    expect(parseImportFile(JSON.stringify(build(15_000))).ok).toBe(true);
    expect(parseImportFile(JSON.stringify(build(15_001)))).toEqual(INVALID);
  });

  const category = (i: number): OpenedExport["categories"][number] => ({
    id: `cat-${i}`,
    name: `Categoria ${i}`,
    color: 1,
    isInvestment: false,
    deletedFrom: null,
    percentVersions: [{ fromMonth: "0001-01-01", percentMicro: 1 }],
    subcategories: [],
  });

  it("accepts 1.000 categories and rejects 1.001", () => {
    const build = (n: number) => ({ transactions: [], categories: Array.from({ length: n }, (_, i) => category(i)), goal: null, birthDate: null });
    expect(parseImportFile(JSON.stringify(build(1_000))).ok).toBe(true);
    expect(parseImportFile(JSON.stringify(build(1_001)))).toEqual(INVALID);
  });

  it("accepts 100 percent versions in a category and rejects 101", () => {
    const versions = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ fromMonth: `${String(2000 + Math.floor(i / 12)).padStart(4, "0")}-${String((i % 12) + 1).padStart(2, "0")}-01`, percentMicro: 1 }));
    expect(parseWith((d) => (d.categories[0].percentVersions = versions(100))).ok).toBe(true);
    expect(parseWith((d) => (d.categories[0].percentVersions = versions(101)))).toEqual(INVALID);
  });

  it("accepts 30 subcategories in a category and rejects 31", () => {
    const subs = (n: number) => [{ id: SUB_A1, name: "Aluguel" }, ...Array.from({ length: n - 1 }, (_, i) => ({ id: `s-${i}`, name: `Sub ${i}` }))];
    expect(parseWith((d) => (d.categories[0].subcategories = subs(30))).ok).toBe(true);
    expect(parseWith((d) => (d.categories[0].subcategories = subs(31)))).toEqual(INVALID);
  });
});
