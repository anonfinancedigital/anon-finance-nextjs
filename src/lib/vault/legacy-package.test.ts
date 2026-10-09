import { describe, expect, it } from "vitest";
import { DecryptError } from "@/lib/crypto/aead";
import { openExport } from "./export";
import { buildLegacyPackage } from "./legacy-package";
import type { ExportPayload, LegacyPackage, LegacyPlain } from "./types";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const USER = "11111111-1111-4111-8111-111111111111";
const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const SUB_A2 = "a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2";

const PLAIN: LegacyPlain = {
  transactions: [
    {
      id: "t1",
      kind: "expense",
      date: "2026-09-05",
      categoryId: CAT_A,
      subcategoryId: SUB_A1,
      amountCents: 1234567,
      description: "Supermercado Primavera",
      recurring: false,
      recurrenceDay: null,
      recurrenceEnd: null,
      seriesId: null,
    },
    {
      id: "t2",
      kind: "income",
      date: "2026-08-01",
      categoryId: null,
      subcategoryId: null,
      amountCents: 7654321,
      description: null,
      recurring: true,
      recurrenceDay: 1,
      recurrenceEnd: "2027-01-01",
      seriesId: "s1",
    },
  ],
  categories: [
    {
      id: CAT_A,
      name: "Moradia Aconchegante",
      color: 3,
      isInvestment: false,
      deletedFrom: null,
      versions: [
        { fromMonth: "2026-01-01", percentMicro: 314159 },
        { fromMonth: "2026-06-01", percentMicro: 271828 },
      ],
      subcategories: [
        { id: SUB_A1, name: "Aluguel Mensal" },
        { id: SUB_A2, name: "Condominio Predial" },
      ],
    },
    {
      id: CAT_B,
      name: "Reserva Futura",
      color: 7,
      isInvestment: true,
      deletedFrom: "2026-07-01",
      versions: [{ fromMonth: "2026-02-01", percentMicro: 161803 }],
      subcategories: [],
    },
  ],
  goal: {
    monthlyIncomeCents: 987654,
    savedCents: 4567890,
    retirementAge: 63,
    annualRateBp: 789,
    withdrawalRateBp: 412,
  },
  birthDate: "1987-11-23",
};

const EMPTY: LegacyPlain = { transactions: [], categories: [], goal: null, birthDate: null };

/** The rows as the server would return them after the migration: plain structure + package ciphertext. */
function asExportPayload(plain: LegacyPlain, pkg: LegacyPackage): ExportPayload {
  const tx = new Map(pkg.transactions.map((t) => [t.id, t]));
  const cats = new Map(pkg.categories.map((c) => [c.id, c]));
  return {
    transactions: plain.transactions.map((t) => ({
      id: t.id,
      kind: t.kind,
      date: t.date,
      categoryId: t.categoryId,
      subcategoryId: t.subcategoryId,
      amountCt: tx.get(t.id)!.amountCt,
      descriptionCt: tx.get(t.id)!.descriptionCt,
      recurring: t.recurring,
      recurrenceDay: t.recurrenceDay,
      recurrenceEnd: t.recurrenceEnd,
      seriesId: t.seriesId,
    })),
    categories: plain.categories.map((c) => ({
      id: c.id,
      color: c.color,
      isInvestment: c.isInvestment,
      deletedFrom: c.deletedFrom,
      nameCt: cats.get(c.id)!.nameCt,
      versions: cats.get(c.id)!.versions,
      subcategories: cats.get(c.id)!.subcategories,
    })),
    goal: pkg.goal,
    birthDateCt: pkg.birthDateCt,
  };
}

describe("buildLegacyPackage", () => {
  it("keeps the same ids as plain: transactions, categories, subcategories, versions, goal", async () => {
    const pkg = await buildLegacyPackage({ plain: PLAIN, userId: USER, dek: await newKey() });

    expect(pkg.transactions.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(pkg.categories.map((c) => c.id)).toEqual([CAT_A, CAT_B]);
    expect(pkg.categories.map((c) => c.subcategories.map((s) => s.id))).toEqual([[SUB_A1, SUB_A2], []]);
    expect(pkg.categories.map((c) => c.versions.map((v) => v.fromMonth))).toEqual([
      ["2026-01-01", "2026-06-01"],
      ["2026-02-01"],
    ]);
    expect(pkg.goal).not.toBeNull();
    expect(pkg.transactions[1].descriptionCt).toBeNull();
    expect(pkg.birthDateCt).toMatch(/^v1:/);
  });

  it("opening the package with openExport reproduces plain (SIGILO-23)", async () => {
    const dek = await newKey();
    const pkg = await buildLegacyPackage({ plain: PLAIN, userId: USER, dek });

    const opened = await openExport(dek, USER, asExportPayload(PLAIN, pkg));

    expect(opened.transactions).toEqual(PLAIN.transactions);
    expect(opened.categories).toEqual(
      PLAIN.categories.map(({ versions, ...c }) => ({ ...c, percentVersions: versions })),
    );
    expect(opened.goal).toEqual(PLAIN.goal);
    expect(opened.birthDate).toBe(PLAIN.birthDate);
  });

  it("binds each value to its own row: a ciphertext moved to another row does not open", async () => {
    const dek = await newKey();
    const pkg = await buildLegacyPackage({ plain: PLAIN, userId: USER, dek });
    const payload = asExportPayload(PLAIN, pkg);
    payload.transactions[1].amountCt = payload.transactions[0].amountCt;

    await expect(openExport(dek, USER, payload)).rejects.toBeInstanceOf(DecryptError);
  });

  it("the serialized package carries no plain value", async () => {
    const pkg = await buildLegacyPackage({ plain: PLAIN, userId: USER, dek: await newKey() });
    const sent = JSON.stringify(pkg);

    for (const value of [
      "Supermercado Primavera",
      "Moradia Aconchegante",
      "Aluguel Mensal",
      "Condominio Predial",
      "Reserva Futura",
      "1234567",
      "7654321",
      "314159",
      "271828",
      "161803",
      "987654",
      "4567890",
      "1987-11-23",
    ]) {
      expect(sent).not.toContain(value);
    }
    for (const key of ["amountCents", "description\"", "name\"", "percentMicro", "birthDate\"", "savedCents"]) {
      expect(sent).not.toContain(`"${key}`);
    }
  });

  it("an account with no data gives empty lists and null goal and birth date", async () => {
    const pkg = await buildLegacyPackage({ plain: EMPTY, userId: USER, dek: await newKey() });

    expect(pkg).toEqual({ transactions: [], categories: [], goal: null, birthDateCt: null });
  });
});
