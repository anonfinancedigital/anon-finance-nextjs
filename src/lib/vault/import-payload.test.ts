import { describe, expect, it } from "vitest";
import { DecryptError } from "@/lib/crypto/aead";
import { type OpenedExport, openExport } from "./export";
import { buildImportPayload, ImportTooLargeError } from "./import-payload";
import { IMPORT_INVALID } from "./import-file";
import { openBirthDate } from "./open";

const newKey = (usages: KeyUsage[] = ["encrypt", "decrypt"]) =>
  crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, usages);

const USER = "destination-user";
const NOW = new Date("2026-10-10T12:00:00Z");
const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const SUB_B1 = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const goal = { monthlyIncomeCents: 1_500_000, savedCents: 25_000_000, retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 400 };

function fullExport(): OpenedExport {
  return {
    transactions: [
      { id: "t1", kind: "expense", date: "2026-10-05", categoryId: CAT_A, subcategoryId: SUB_A1, amountCents: 15000, description: "Mercado", recurring: false, recurrenceDay: null, recurrenceEnd: null, seriesId: null },
      { id: "t2", kind: "income", date: "2026-08-05", categoryId: null, subcategoryId: null, amountCents: 500000, description: null, recurring: true, recurrenceDay: 31, recurrenceEnd: "2026-12-01", seriesId: "t2" },
      { id: "t3", kind: "income", date: "2027-01-05", categoryId: null, subcategoryId: null, amountCents: 600000, description: null, recurring: true, recurrenceDay: 31, recurrenceEnd: null, seriesId: "t2" },
      { id: "t4", kind: "expense", date: "2026-09-01", categoryId: CAT_B, subcategoryId: null, amountCents: 9900, description: "Cinema com amigos", recurring: false, recurrenceDay: null, recurrenceEnd: null, seriesId: null },
    ],
    categories: [
      { id: CAT_A, name: "Moradia", color: 3, isInvestment: false, deletedFrom: null, percentVersions: [{ fromMonth: "0001-01-01", percentMicro: 30_000_000 }, { fromMonth: "2026-09-01", percentMicro: 35_000_000 }], subcategories: [{ id: SUB_A1, name: "Aluguel" }] },
      { id: CAT_B, name: "Lazer", color: 7, isInvestment: true, deletedFrom: "2026-10-01", percentVersions: [{ fromMonth: "0001-01-01", percentMicro: 10_000_000 }], subcategories: [{ id: SUB_B1, name: "Cinema" }] },
    ],
    goal,
    birthDate: "1990-03-15",
  };
}

const build = async (data: OpenedExport, extra: Partial<Parameters<typeof buildImportPayload>[0]> = {}) => {
  const dek = await newKey();
  const result = await buildImportPayload({ data, userId: USER, dek, accountBirthDate: null, now: NOW, ...extra });
  return { dek, ...result };
};

/** The payload as the export would hold it: opens with the destination key and user. */
const reopen = (dek: CryptoKey, payload: Awaited<ReturnType<typeof build>>["payload"]) => openExport(dek, USER, payload);

/** Rows without ids and without references, to compare the content of two exports. */
function withoutIds(data: OpenedExport) {
  return {
    transactions: data.transactions.map((t) => ({
      kind: t.kind,
      date: t.date,
      amountCents: t.amountCents,
      description: t.description,
      recurring: t.recurring,
      recurrenceDay: t.recurrenceDay,
      recurrenceEnd: t.recurrenceEnd,
    })),
    categories: data.categories.map((c) => ({
      name: c.name,
      color: c.color,
      isInvestment: c.isInvestment,
      deletedFrom: c.deletedFrom,
      percentVersions: c.percentVersions,
      subcategories: c.subcategories.map((s) => s.name),
    })),
    goal: data.goal,
    birthDate: data.birthDate,
  };
}

describe("new ids and references (IMPORT-06)", () => {
  it("gives every transaction, category and subcategory a new UUID", async () => {
    const data = fullExport();
    const { payload } = await build(data);
    const oldIds = new Set(["t1", "t2", "t3", "t4", CAT_A, CAT_B, SUB_A1, SUB_B1]);
    const newIds = [
      ...payload.transactions.map((t) => t.id),
      ...payload.categories.map((c) => c.id),
      ...payload.categories.flatMap((c) => c.subcategories.map((s) => s.id)),
    ];
    expect(newIds).toHaveLength(8);
    for (const id of newIds) {
      expect(id).toMatch(UUID);
      expect(oldIds.has(id)).toBe(false);
    }
    expect(new Set(newIds).size).toBe(8);
  });

  it("points every transaction to the new equivalent category and subcategory", async () => {
    const { payload } = await build(fullExport());
    const [catA, catB] = payload.categories;
    const [t1, t2, t3, t4] = payload.transactions;
    expect(t1.categoryId).toBe(catA.id);
    expect(t1.subcategoryId).toBe(catA.subcategories[0].id);
    expect(t4.categoryId).toBe(catB.id);
    expect(t4.subcategoryId).toBeNull();
    expect([t2.categoryId, t2.subcategoryId, t3.categoryId, t3.subcategoryId]).toEqual([null, null, null, null]);
  });

  it("gives the segments of a series one shared new seriesId, the id of its first segment", async () => {
    const { payload } = await build(fullExport());
    const [t1, t2, t3, t4] = payload.transactions;
    expect(t2.seriesId).toBe(t2.id);
    expect(t3.seriesId).toBe(t2.id);
    expect(t2.seriesId).not.toBe("t2");
    expect([t1.seriesId, t4.seriesId]).toEqual([null, null]);
  });

  it("generates a fresh seriesId when the first segment of the series is not in the file", async () => {
    const data = fullExport();
    for (const t of data.transactions) if (t.seriesId === "t2") t.seriesId = "gone";
    const { payload } = await build(data);
    const [, t2, t3] = payload.transactions;
    expect(t2.seriesId).toMatch(UUID);
    expect(t2.seriesId).not.toBe("gone");
    expect(t3.seriesId).toBe(t2.seriesId);
  });

  it("uses the injected id generator", async () => {
    let n = 0;
    const { payload } = await build(fullExport(), { newId: () => `id-${++n}` });
    expect(payload.categories.map((c) => c.id)).toEqual(["id-1", "id-2"]);
  });
});

describe("sealing (IMPORT-03, IMPORT-05, IMPORT-27)", () => {
  it("opens with the destination key and user to the same values as the file, except ids", async () => {
    const data = fullExport();
    const { dek, payload } = await build(data);
    const opened = await reopen(dek, payload);
    expect(withoutIds(opened)).toEqual(withoutIds(data));
  });

  it("keeps the structure in clear: kind, date, recurrence, color, investment flag, deletedFrom and percent months", async () => {
    const { payload } = await build(fullExport());
    const [t1, t2, , t4] = payload.transactions;
    expect([t1.kind, t1.date, t1.recurring, t1.recurrenceDay, t1.recurrenceEnd]).toEqual(["expense", "2026-10-05", false, null, null]);
    expect([t2.kind, t2.date, t2.recurring, t2.recurrenceDay, t2.recurrenceEnd]).toEqual(["income", "2026-08-05", true, 31, "2026-12-01"]);
    expect(t4.descriptionCt).not.toBeNull();
    expect(payload.transactions[1].descriptionCt).toBeNull();
    const [catA, catB] = payload.categories;
    expect([catA.color, catA.isInvestment, catA.deletedFrom]).toEqual([3, false, null]);
    expect([catB.color, catB.isInvestment, catB.deletedFrom]).toEqual([7, true, "2026-10-01"]);
    expect(catA.versions.map((v) => v.fromMonth)).toEqual(["0001-01-01", "2026-09-01"]);
  });

  it("does not open under another user (the cipher is bound to the destination user)", async () => {
    const { dek, payload } = await build(fullExport());
    await expect(openExport(dek, "someone-else", payload)).rejects.toBeInstanceOf(DecryptError);
  });

  it("sends no value, description, name, goal or birth date in clear (IMPORT-25)", async () => {
    const { payload } = await build(fullExport());
    const json = JSON.stringify(payload);
    for (const secret of ["Mercado", "Cinema", "Moradia", "Lazer", "Aluguel", "1990-03-15", "15000", "1500000", "25000000"]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toContain('"amountCents"');
    expect(json).not.toContain('"name"');
  });

  it("fails before returning a payload when a field cannot be sealed (IMPORT-26)", async () => {
    const dek = await newKey(["decrypt"]);
    await expect(buildImportPayload({ data: fullExport(), userId: USER, dek, accountBirthDate: null, now: NOW })).rejects.toThrow();
  });

  it("builds an empty payload for an export without rows (IMPORT-29)", async () => {
    const { payload, goalSkipped } = await build({ transactions: [], categories: [], goal: null, birthDate: null });
    expect(payload).toEqual({ transactions: [], categories: [], goal: null, birthDateCt: null });
    expect(goalSkipped).toBe(false);
  });
});

describe("goal and birth date (IMPORT-22)", () => {
  it("seals the goal when it fits the birth date of the account", async () => {
    const { dek, payload, goalSkipped } = await build(fullExport(), { accountBirthDate: "1990-01-01" });
    expect(goalSkipped).toBe(false);
    expect((await reopen(dek, payload)).goal).toEqual(goal);
  });

  it("drops the goal and reports it when the account is already at or past the retirement age", async () => {
    // Born 1970-01-01: 56 years old on 2026-10-10, retirement age 55.
    const { payload, goalSkipped } = await build(fullExport(), { accountBirthDate: "1970-01-01" });
    expect(goalSkipped).toBe(true);
    expect(payload.goal).toBeNull();
  });

  it("keeps the goal when the account is one year short of the retirement age", async () => {
    // Born 1971-10-11: 54 years old on 2026-10-10 (birthday tomorrow), retirement age 55.
    const { payload, goalSkipped } = await build(fullExport(), { accountBirthDate: "1971-10-11" });
    expect(goalSkipped).toBe(false);
    expect(payload.goal).not.toBeNull();
  });

  it("drops the goal when the age on the retirement birthday is exactly reached", async () => {
    // Born 1971-10-10: turns 55 on 2026-10-10.
    const { goalSkipped } = await build(fullExport(), { accountBirthDate: "1971-10-10" });
    expect(goalSkipped).toBe(true);
  });

  it("uses the birth date of the file when the account has none", async () => {
    const old = fullExport();
    old.birthDate = "1960-05-05";
    expect((await build(old, { accountBirthDate: null })).goalSkipped).toBe(true);
    expect((await build(fullExport(), { accountBirthDate: null })).goalSkipped).toBe(false);
  });

  it("imports the goal when neither the account nor the file has a birth date", async () => {
    const data = fullExport();
    data.birthDate = null;
    const { payload, goalSkipped } = await build(data, { accountBirthDate: null });
    expect(goalSkipped).toBe(false);
    expect(payload.goal).not.toBeNull();
  });

  it("does not report a skipped goal when the file has none", async () => {
    const data = fullExport();
    data.goal = null;
    const { payload, goalSkipped } = await build(data, { accountBirthDate: "1970-01-01" });
    expect(payload.goal).toBeNull();
    expect(goalSkipped).toBe(false);
  });

  it("seals the birth date of the file for the destination user, or null when the file has none", async () => {
    const { dek, payload } = await build(fullExport());
    expect(await openBirthDate(dek, USER, payload.birthDateCt)).toBe("1990-03-15");
    const data = fullExport();
    data.birthDate = null;
    expect((await build(data)).payload.birthDateCt).toBeNull();
  });
});

describe("size cap (IMPORT-13)", () => {
  it("rejects with the invalid-file message when the body is above the cap and accepts it at the cap", async () => {
    const dek = await newKey();
    const base = { data: fullExport(), userId: USER, dek, accountBirthDate: null, now: NOW, newId: (() => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`; })() };
    const probe = await buildImportPayload({ ...base, maxBodyChars: Number.MAX_SAFE_INTEGER });
    const length = JSON.stringify(probe.payload).length;

    // Ciphertext lengths are deterministic, so the same input keeps the same size.
    const again = (max: number) => buildImportPayload({ ...base, newId: (() => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`; })(), maxBodyChars: max });
    await expect(again(length)).resolves.toBeDefined();
    const rejected = await again(length - 1).catch((e) => e);
    expect(rejected).toBeInstanceOf(ImportTooLargeError);
    expect(rejected.message).toBe(IMPORT_INVALID);
  });

  it("defaults the cap to 7.000.000 characters", async () => {
    const { MAX_IMPORT_BODY_CHARS } = await import("./import-payload");
    expect(MAX_IMPORT_BODY_CHARS).toBe(7_000_000);
  });
});
