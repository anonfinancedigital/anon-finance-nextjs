import { describe, expect, it } from "vitest";
import { encryptField } from "@/lib/crypto/aead";
import { buildExport, exportFileName, openExport } from "./export";
import { sealBirthDate, sealGoal, sealTransaction } from "./seal";
import type { ExportPayload } from "./types";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const USER = "user-1";
const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";

const goal = { monthlyIncomeCents: 1500000, savedCents: 25000000, retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 400 };

/** Fixed user: a single expense, a recurring income series, an active and a deleted category, goal and birth date. */
async function sealedExport(dek: CryptoKey): Promise<ExportPayload> {
  const seal = (text: string, aadText: string) => encryptField(dek, text, aadText);
  return {
    transactions: [
      {
        id: "t1",
        kind: "expense",
        date: "2026-10-05",
        categoryId: CAT_A,
        subcategoryId: SUB_A1,
        ...(await sealTransaction(dek, USER, "t1", { amountCents: 15000, description: "Mercado" })),
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
        ...(await sealTransaction(dek, USER, "t2", { amountCents: 500000, description: null })),
        recurring: true,
        recurrenceDay: 5,
        recurrenceEnd: "2027-07-01",
        seriesId: "t2",
      },
    ],
    categories: [
      {
        id: CAT_A,
        color: 3,
        isInvestment: false,
        deletedFrom: null,
        nameCt: await seal("Moradia", `category.name_ct.user-1.${CAT_A}`),
        versions: [
          { fromMonth: "0001-01-01", percentCt: await seal("30000000", `category_percent.percent_ct.user-1.${CAT_A}.0001-01-01`) },
          { fromMonth: "2026-09-01", percentCt: await seal("35000000", `category_percent.percent_ct.user-1.${CAT_A}.2026-09-01`) },
        ],
        subcategories: [{ id: SUB_A1, nameCt: await seal("Aluguel", `subcategory.name_ct.user-1.${SUB_A1}`) }],
      },
      {
        id: CAT_B,
        color: 7,
        isInvestment: true,
        deletedFrom: "2026-08-01",
        nameCt: await seal("Viagem", `category.name_ct.user-1.${CAT_B}`),
        versions: [
          { fromMonth: "0001-01-01", percentCt: await seal("10000000", `category_percent.percent_ct.user-1.${CAT_B}.0001-01-01`) },
        ],
        subcategories: [],
      },
    ],
    goal: await sealGoal(dek, USER, goal),
    birthDateCt: await sealBirthDate(dek, USER, "1990-05-17"),
  };
}

describe("openExport + buildExport", () => {
  it("o arquivo contém todas as seções com os valores em claro do conjunto fixo", async () => {
    const dek = await newKey();
    const file = buildExport(await openExport(dek, USER, await sealedExport(dek)));
    expect(file).not.toContain("v1:");
    expect(JSON.parse(file)).toEqual({
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
          recurrenceEnd: "2027-07-01",
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
            { fromMonth: "0001-01-01", percentMicro: 30000000 },
            { fromMonth: "2026-09-01", percentMicro: 35000000 },
          ],
          subcategories: [{ id: SUB_A1, name: "Aluguel" }],
        },
        {
          id: CAT_B,
          name: "Viagem",
          color: 7,
          isInvestment: true,
          deletedFrom: "2026-08-01",
          percentVersions: [{ fromMonth: "0001-01-01", percentMicro: 10000000 }],
          subcategories: [],
        },
      ],
      goal: { monthlyIncomeCents: 1500000, savedCents: 25000000, retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 400 },
      birthDate: "1990-05-17",
    });
  });

  it("usuário sem dados gera listas vazias e a data de nascimento", async () => {
    const dek = await newKey();
    const payload: ExportPayload = {
      transactions: [],
      categories: [],
      goal: null,
      birthDateCt: await sealBirthDate(dek, USER, "1985-12-31"),
    };
    expect(JSON.parse(buildExport(await openExport(dek, USER, payload)))).toEqual({
      transactions: [],
      categories: [],
      goal: null,
      birthDate: "1985-12-31",
    });
  });
});

describe("exportFileName", () => {
  it("23h30 de 31/12 em UTC-3 usa o dia local", () => {
    expect(exportFileName(new Date("2027-01-01T02:30:00Z"))).toBe("orcamento-dados-2026-12-31.json");
  });

  it("usa AAAA-MM-DD da data de hoje em America/Sao_Paulo", () => {
    expect(exportFileName(new Date("2026-03-09T15:00:00Z"))).toBe("orcamento-dados-2026-03-09.json");
  });
});
