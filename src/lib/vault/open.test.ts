import { describe, expect, it } from "vitest";
import { DecryptError, encryptField } from "@/lib/crypto/aead";
import type { Occurrence } from "@/lib/db/repos/transactions";
import { filterTransactions, searchTransactions } from "@/lib/domain/transaction-filter";
import { openBirthDate, openGoal, openMonth } from "./open";
import { sealBirthDate, sealGoal, sealTransaction } from "./seal";
import { sealCategorySet } from "./seal-categories";
import type { MonthPayload } from "./types";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const USER = "user-1";
/** 15/10/2026 in America/Sao_Paulo: the current month is October 2026. */
const NOW = new Date("2026-10-15T12:00:00Z");
const OCT = { year: 2026, month: 10 };

const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const SUB_A2 = "a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2";
const CREATED = new Date("2026-10-01T10:00:00Z");

const base = {
  date: "2026-10-05",
  month: "2026-10",
  recurring: false,
  recurrenceEnd: null,
  installment: null,
  seriesStart: null,
  createdAt: CREATED,
  updatedAt: CREATED,
};

/** The month as the UI expects it after opening. */
const OCCURRENCES: Occurrence[] = [
  { ...base, id: "t1", kind: "expense", amountCents: 15000, description: "Mercado do mês", categoryId: CAT_A, subcategoryId: SUB_A1 },
  { ...base, id: "t2", kind: "expense", amountCents: 3000, description: null, categoryId: CAT_A, subcategoryId: null },
  {
    ...base,
    id: "t3",
    kind: "income",
    amountCents: 500000,
    description: "Salário",
    categoryId: null,
    subcategoryId: null,
    recurring: true,
    recurrenceEnd: "2027-07-01",
    installment: { number: 3, total: 12 },
    seriesStart: "2026-08",
  },
  { ...base, id: "t4", kind: "expense", amountCents: 2500, description: "Café", categoryId: CAT_A, subcategoryId: SUB_A2 },
];

/** Sealed rows of the month: A has 30% since ever, 35% from September and 45% from November; B was deleted and has no version. */
async function sealedMonth(dek: CryptoKey): Promise<MonthPayload> {
  const percent = (micro: string, fromMonth: string) =>
    encryptField(dek, micro, `category_percent.percent_ct.user-1.${CAT_A}.${fromMonth}`);
  const { items } = await sealCategorySet(
    dek,
    USER,
    [
      {
        id: CAT_A,
        name: "Moradia",
        percentMicro: 30_000_000,
        color: 3,
        subcategories: [
          { id: SUB_A1, name: "Aluguel" },
          { id: SUB_A2, name: "Luz" },
        ],
      },
      { id: CAT_B, name: "Viagem", percentMicro: 1, color: 7, isInvestment: true },
    ],
    new Map(),
    NOW,
  );
  return {
    categories: [
      {
        id: CAT_A,
        color: 3,
        isInvestment: false,
        deleted: false,
        nameCt: items[0].nameCt,
        versions: [
          { fromMonth: "0001-01-01", percentCt: await percent("30000000", "0001-01-01") },
          { fromMonth: "2026-09-01", percentCt: await percent("35000000", "2026-09-01") },
          { fromMonth: "2026-11-01", percentCt: await percent("45000000", "2026-11-01") },
        ],
        subcategories: items[0].subcategories.map((s) => ({ id: s.id!, nameCt: s.nameCt })),
      },
      { id: CAT_B, color: 7, isInvestment: true, deleted: true, nameCt: items[1].nameCt, versions: [], subcategories: [] },
    ],
    occurrences: await Promise.all(
      OCCURRENCES.map(async ({ amountCents, description, ...o }) => ({
        ...o,
        ...(await sealTransaction(dek, USER, o.id, { amountCents, description })),
      })),
    ),
    totalTransactions: 4,
  };
}

const flip = (ct: string) => {
  const i = 10;
  return ct.slice(0, i) + (ct[i] === "A" ? "B" : "A") + ct.slice(i + 1);
};

describe("openMonth", () => {
  it("ida e volta reproduz categorias e ocorrências com tipos e valores originais", async () => {
    const dek = await newKey();
    const opened = await openMonth(dek, USER, await sealedMonth(dek), OCT, NOW);
    expect(opened.occurrences).toEqual(OCCURRENCES);
    expect(opened.categories).toEqual([
      {
        id: CAT_A,
        name: "Moradia",
        color: 3,
        isInvestment: false,
        deleted: false,
        percentMicro: 35_000_000,
        hasPercent: true,
        subcategories: [
          { id: SUB_A1, name: "Aluguel" },
          { id: SUB_A2, name: "Luz" },
        ],
      },
      {
        id: CAT_B,
        name: "Viagem",
        color: 7,
        isInvestment: true,
        deleted: true,
        percentMicro: 0,
        hasPercent: false,
        subcategories: [],
      },
    ]);
  });

  it.each([
    [{ year: 2026, month: 8 }, 30_000_000],
    [{ year: 2026, month: 9 }, 35_000_000],
    [{ year: 2026, month: 12 }, 35_000_000],
  ])("percentual vigente em %o: meses futuros usam o mês corrente", async (month, expected) => {
    const dek = await newKey();
    const opened = await openMonth(dek, USER, await sealedMonth(dek), month, NOW);
    expect(opened.categories[0].percentMicro).toBe(expected);
  });

  it.each([
    ["nome da categoria", (p: MonthPayload) => (p.categories[0].nameCt = flip(p.categories[0].nameCt))],
    ["versão de percentual", (p: MonthPayload) => (p.categories[0].versions[2].percentCt = flip(p.categories[0].versions[2].percentCt))],
    ["nome da subcategoria", (p: MonthPayload) => (p.categories[0].subcategories[1].nameCt = flip(p.categories[0].subcategories[1].nameCt))],
    ["valor", (p: MonthPayload) => (p.occurrences[3].amountCt = flip(p.occurrences[3].amountCt))],
    ["descrição", (p: MonthPayload) => (p.occurrences[0].descriptionCt = flip(p.occurrences[0].descriptionCt!))],
    ["valor movido para outra linha", (p: MonthPayload) => (p.occurrences[1].amountCt = p.occurrences[0].amountCt)],
  ])("%s adulterado lança DecryptError sem resultado parcial", async (_label, tamper) => {
    const dek = await newKey();
    const payload = await sealedMonth(dek);
    tamper(payload);
    await expect(openMonth(dek, USER, payload, OCT, NOW)).rejects.toBeInstanceOf(DecryptError);
  });

  it("busca por descrição e filtro por categoria e subcategoria dão as mesmas transações do conjunto fixo", async () => {
    const dek = await newKey();
    const { occurrences } = await openMonth(dek, USER, await sealedMonth(dek), OCT, NOW);
    const ids = (txs: Occurrence[]) => txs.map((t) => t.id);
    expect(ids(searchTransactions(occurrences, "cafe"))).toEqual(["t4"]);
    expect(ids(searchTransactions(occurrences, "MERCADO"))).toEqual(["t1"]);
    expect(ids(filterTransactions(occurrences, { categoryId: CAT_A, subcategoryId: null }))).toEqual(["t1", "t2", "t4"]);
    expect(ids(filterTransactions(occurrences, { categoryId: CAT_A, subcategoryId: SUB_A1 }))).toEqual(["t1"]);
    expect(ids(filterTransactions(occurrences, { categoryId: CAT_A, subcategoryId: "none" }))).toEqual(["t2"]);
  });
});

describe("openGoal / openBirthDate", () => {
  const values = {
    monthlyIncomeCents: 1500000,
    savedCents: 25000000,
    retirementAge: 55,
    annualRateBp: 800,
    withdrawalRateBp: 400,
  };

  it("ida e volta reproduz a meta e a data de nascimento", async () => {
    const dek = await newKey();
    const birthDate = await openBirthDate(dek, USER, await sealBirthDate(dek, USER, "1990-05-17"));
    expect(birthDate).toBe("1990-05-17");
    expect(await openGoal(dek, USER, await sealGoal(dek, USER, values), birthDate!)).toEqual({
      ...values,
      birthDate: "1990-05-17",
    });
  });

  it("data de nascimento null continua null", async () => {
    const dek = await newKey();
    expect(await openBirthDate(dek, USER, null)).toBeNull();
  });

  it("campo da meta ou data de nascimento adulterados lançam DecryptError", async () => {
    const dek = await newKey();
    const dto = await sealGoal(dek, USER, values);
    await expect(openGoal(dek, USER, { ...dto, savedCt: flip(dto.savedCt) }, "1990-05-17")).rejects.toBeInstanceOf(
      DecryptError,
    );
    await expect(
      openGoal(dek, USER, { ...dto, savedCt: dto.monthlyIncomeCt }, "1990-05-17"),
    ).rejects.toBeInstanceOf(DecryptError);
    await expect(openBirthDate(dek, USER, flip(await sealBirthDate(dek, USER, "1990-05-17")))).rejects.toBeInstanceOf(
      DecryptError,
    );
    await expect(openBirthDate(dek, "user-2", await sealBirthDate(dek, USER, "1990-05-17"))).rejects.toBeInstanceOf(
      DecryptError,
    );
  });
});
