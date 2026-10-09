import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { monthRange } from "@/lib/domain/month";
import type { TransactionDto, UpdateTransactionDto } from "@/lib/vault/types";
import { insertCategory, insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { subcategory, transaction } from "../schema";
import { transactionsRepo } from "./transactions";

setupTestDb();

const OCTOBER = monthRange({ year: 2026, month: 10 });

let userId: string;
let conforto: string;
let lazer: string;

beforeEach(async () => {
  userId = await insertTestUser();
  conforto = (await insertCategory(userId, { name: "Conforto", percentMicro: 60000000, color: 1 })).id;
  lazer = (await insertCategory(userId, { name: "Lazer", percentMicro: 40000000, color: 2 })).id;
});

/** Stand-in for a sealed amount: the tests read it back as `v1:a<cents>`. */
const amountCt = (cents: number) => `v1:a${cents}`;
const centsOf = (ct: string) => Number(ct.slice(4));

const expense = (date: string, cents = 1000): TransactionDto => ({
  id: randomUUID(),
  kind: "expense",
  date,
  categoryId: conforto,
  subcategoryId: null,
  amountCt: amountCt(cents),
  descriptionCt: null,
  recurrence: "none",
});

const stored = async (id: string) =>
  (await db.select().from(transaction).where(eq(transaction.id, id)))[0];

describe("transactionsRepo.createSealed", () => {
  it("stores the ciphertext and leaves the plain-text columns NULL", async () => {
    const dto = { ...expense("2026-10-04", 20000), descriptionCt: "v1:descricao" };
    await transactionsRepo.createSealed(userId, dto);

    const row = await stored(dto.id);
    expect(row.amountCt).toBe("v1:a20000");
    expect(row.amountCt!.startsWith("v1:")).toBe(true);
    expect(row.descriptionCt).toBe("v1:descricao");
    expect(row.amountCents).toBeNull();
    expect(row.description).toBeNull();
    expect(row).toMatchObject({ userId, kind: "expense", date: "2026-10-04", categoryId: conforto });
  });

  it("creates only one row when the same id is sent twice", async () => {
    const dto = expense("2026-10-04", 20000);
    await transactionsRepo.createSealed(userId, dto);
    await transactionsRepo.createSealed(userId, { ...dto, amountCt: amountCt(99900) });

    const rows = await db.select().from(transaction);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: dto.id, userId, amountCt: "v1:a20000" });
  });

  it("keeps a missing description as NULL in both description columns", async () => {
    const dto = expense("2026-10-04");
    await transactionsRepo.createSealed(userId, dto);

    const row = await stored(dto.id);
    expect(row.descriptionCt).toBeNull();
    expect(row.description).toBeNull();
  });

  it("stores an 'indefinite' expense as one recurring row with day, series = id and no end", async () => {
    const dto = { ...expense("2026-10-15", 10000), recurrence: "indefinite" as const };
    await transactionsRepo.createSealed(userId, dto);

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(dto.id)).toMatchObject({
      recurring: true,
      recurrenceDay: 15,
      seriesId: dto.id,
      recurrenceEnd: null,
      date: "2026-10-15",
      amountCt: "v1:a10000",
    });
  });

  it("stores an 'until' expense with recurrence_end = first day of the final month", async () => {
    const dto = {
      ...expense("2026-10-31"),
      recurrence: "until" as const,
      recurrenceEndMonth: "2027-03",
    };
    await transactionsRepo.createSealed(userId, dto);

    expect(await stored(dto.id)).toMatchObject({
      recurring: true,
      recurrenceDay: 31,
      seriesId: dto.id,
      recurrenceEnd: "2027-03-01",
    });
  });

  it("starts an 'until' series in recurrenceStartMonth, on the day of the date", async () => {
    const dto = {
      ...expense("2026-10-15"),
      recurrence: "until" as const,
      recurrenceStartMonth: "2026-12",
      recurrenceEndMonth: "2027-02",
    };
    await transactionsRepo.createSealed(userId, dto);

    expect(await stored(dto.id)).toMatchObject({ date: "2026-12-15", recurrenceEnd: "2027-02-01" });
  });

  it("stores a non-recurring row with recurring = false and the other fields null", async () => {
    const dto = expense("2026-10-15");
    await transactionsRepo.createSealed(userId, dto);
    await transactionsRepo.createSealed(userId, { ...dto, recurrence: "indefinite" });

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(dto.id)).toMatchObject({
      recurring: false,
      recurrenceDay: null,
      seriesId: null,
      recurrenceEnd: null,
    });
  });

  it("stores a recurring income without category", async () => {
    const dto: TransactionDto = {
      id: randomUUID(),
      kind: "income",
      date: "2026-10-05",
      categoryId: null,
      subcategoryId: null,
      amountCt: amountCt(500000),
      descriptionCt: null,
      recurrence: "indefinite",
    };
    await transactionsRepo.createSealed(userId, dto);

    expect(await stored(dto.id)).toMatchObject({
      kind: "income",
      categoryId: null,
      recurring: true,
      recurrenceDay: 5,
      seriesId: dto.id,
    });
  });
});

describe("transactionsRepo.listByMonthSealed", () => {
  it("returns only the month's transactions, latest date first", async () => {
    const sep30 = expense("2026-09-30");
    const oct01 = expense("2026-10-01");
    const oct15 = expense("2026-10-15");
    const oct31 = expense("2026-10-31");
    const nov01 = expense("2026-11-01");
    for (const tx of [oct15, sep30, oct01, nov01, oct31]) await transactionsRepo.createSealed(userId, tx);

    const listed = await transactionsRepo.listByMonthSealed(userId, OCTOBER);
    expect(listed.map((t) => t.id)).toEqual([oct31.id, oct15.id, oct01.id]);
  });

  it("orders same-day transactions by most recently created first", async () => {
    const first = expense("2026-10-10");
    const second = expense("2026-10-10");
    await transactionsRepo.createSealed(userId, first);
    await transactionsRepo.createSealed(userId, second);

    const listed = await transactionsRepo.listByMonthSealed(userId, OCTOBER);
    expect(listed.map((t) => t.id)).toEqual([second.id, first.id]);
  });

  it("returns the sealed fields only and ignores other users", async () => {
    const income: TransactionDto = {
      id: randomUUID(),
      kind: "income",
      date: "2026-10-05",
      categoryId: null,
      subcategoryId: null,
      amountCt: amountCt(500000),
      descriptionCt: "v1:salario",
      recurrence: "none",
    };
    await transactionsRepo.createSealed(userId, income);
    const otherId = await insertTestUser();
    await transactionsRepo.createSealed(otherId, expense("2026-10-06"));

    const listed = await transactionsRepo.listByMonthSealed(userId, OCTOBER);
    expect(listed).toEqual([
      {
        id: income.id,
        kind: "income",
        date: "2026-10-05",
        month: "2026-10",
        categoryId: null,
        subcategoryId: null,
        amountCt: "v1:a500000",
        descriptionCt: "v1:salario",
        recurring: false,
        recurrenceEnd: null,
        installment: null,
        seriesStart: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    ]);
    expect(Object.keys(listed[0])).not.toContain("amountCents");
    expect(Object.keys(listed[0])).not.toContain("description");
  });

  it("keeps a NULL description as null", async () => {
    await transactionsRepo.createSealed(userId, expense("2026-10-06"));

    const [row] = await transactionsRepo.listByMonthSealed(userId, OCTOBER);
    expect(row.descriptionCt).toBeNull();
  });
});

describe("transactionsRepo.listByMonthSealed recurrence", () => {
  const month = (year: number, m: number) => monthRange({ year, month: m });
  const recurringExpense = (date: string, cents: number, recurrenceEndMonth?: string): TransactionDto => ({
    ...expense(date, cents),
    descriptionCt: "v1:aluguel",
    recurrence: recurrenceEndMonth ? "until" : "indefinite",
    recurrenceEndMonth,
  });

  it("lists in November the occurrence of an 'indefinite' expense of 15/10 on 15/11", async () => {
    const tx = recurringExpense("2026-10-15", 10000);
    await transactionsRepo.createSealed(userId, tx);

    expect(await transactionsRepo.listByMonthSealed(userId, month(2026, 11))).toEqual([
      expect.objectContaining({
        id: tx.id,
        kind: "expense",
        date: "2026-11-15",
        amountCt: "v1:a10000",
        categoryId: conforto,
        descriptionCt: "v1:aluguel",
        recurring: true,
        month: "2026-11",
        seriesStart: "2026-10",
      }),
    ]);
  });

  it("returns recurrenceEnd (null without end) and the stored timestamps", async () => {
    const until = recurringExpense("2026-10-15", 10000, "2026-12");
    const open = recurringExpense("2026-10-16", 10000);
    await transactionsRepo.createSealed(userId, until);
    await transactionsRepo.createSealed(userId, open);

    const listed = await transactionsRepo.listByMonthSealed(userId, month(2026, 11));
    const byId = new Map(listed.map((t) => [t.id, t]));
    expect(byId.get(until.id)!.recurrenceEnd).toBe("2026-12-01");
    expect(byId.get(open.id)!.recurrenceEnd).toBeNull();
    const row = await stored(until.id);
    expect(byId.get(until.id)!.createdAt).toBeInstanceOf(Date);
    expect(byId.get(until.id)!.createdAt).toEqual(row.createdAt);
    expect(byId.get(until.id)!.updatedAt).toEqual(row.updatedAt);
  });

  it("lists an expense of day 31 on 28/02/2026 in February", async () => {
    await transactionsRepo.createSealed(userId, recurringExpense("2026-01-31", 5000));

    const [occurrence] = await transactionsRepo.listByMonthSealed(userId, month(2026, 2));
    expect(occurrence.date).toBe("2026-02-28");
  });

  it("lists the occurrence only between the month of the date and the final month", async () => {
    const tx = recurringExpense("2026-10-15", 10000, "2026-12");
    await transactionsRepo.createSealed(userId, tx);

    const ids = async (y: number, m: number) =>
      (await transactionsRepo.listByMonthSealed(userId, month(y, m))).map((t) => t.id);
    expect(await ids(2026, 9)).toEqual([]);
    expect(await ids(2026, 10)).toEqual([tx.id]);
    expect(await ids(2026, 12)).toEqual([tx.id]);
    expect(await ids(2027, 1)).toEqual([]);
  });

  it("marks recurring occurrences with their installment and single rows as not recurring", async () => {
    const recurring = recurringExpense("2026-10-15", 10000, "2027-03");
    const single = expense("2026-11-02");
    await transactionsRepo.createSealed(userId, recurring);
    await transactionsRepo.createSealed(userId, single);

    const listed = await transactionsRepo.listByMonthSealed(userId, month(2026, 11));
    expect(listed.map((t) => [t.id, t.recurring, t.installment, t.month])).toEqual([
      [recurring.id, true, { number: 2, total: 6 }, "2026-11"],
      [single.id, false, null, "2026-11"],
    ]);
  });

  it("mixes single and recurring rows by projected date desc, ties by most recently created", async () => {
    const recurring = recurringExpense("2026-10-15", 10000);
    const nov03 = expense("2026-11-03");
    const nov15 = expense("2026-11-15");
    const nov20 = expense("2026-11-20");
    for (const tx of [recurring, nov03, nov15, nov20]) await transactionsRepo.createSealed(userId, tx);

    const listed = await transactionsRepo.listByMonthSealed(userId, month(2026, 11));
    expect(listed.map((t) => t.id)).toEqual([nov20.id, nov15.id, recurring.id, nov03.id]);
  });

  it("lists the same occurrences the plain-text path lists for the month (AD-004)", async () => {
    const txs = [
      recurringExpense("2026-10-15", 10000),
      recurringExpense("2026-09-30", 3300, "2026-11"),
      recurringExpense("2026-08-01", 4400, "2026-10"),
      { ...expense("2026-11-02", 2500), categoryId: lazer },
      expense("2026-12-01", 99900),
    ];
    for (const tx of txs) await transactionsRepo.createSealed(userId, tx);

    const listed = await transactionsRepo.listByMonthSealed(userId, month(2026, 11));
    expect(listed.reduce((sum, t) => sum + centsOf(t.amountCt), 0)).toBe(15800);
    expect(listed).toHaveLength(3);
  });
});

describe("transactionsRepo.updateFromSealed", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string) => transactionsRepo.listByMonthSealed(userId, month(key));
  /** Id of the only occurrence listed in the month. */
  const idIn = async (key: string) => {
    const listed = await listIn(key);
    expect(listed).toHaveLength(1);
    return listed[0].id;
  };
  const amountsIn = async (...keys: string[]) =>
    Promise.all(keys.map(async (k) => (await listIn(k)).map((t) => centsOf(t.amountCt))));
  const rent = (date = "2026-10-15", cents = 10000) => ({
    ...expense(date, cents),
    descriptionCt: "v1:aluguel",
    recurrence: "indefinite" as TransactionDto["recurrence"],
    recurrenceEndMonth: undefined as string | undefined,
  });
  /** Edit data for the occurrence of `key`, keeping the day of `base`; the new segment gets the same amount. */
  const edit = (base: ReturnType<typeof rent>, key: string, cents: number) => ({
    ...base,
    date: `${key}-${base.date.slice(8)}`,
    amountCt: amountCt(cents),
    newRowId: randomUUID(),
    insertedCt: { amountCt: amountCt(cents), descriptionCt: base.descriptionCt },
  });
  const snapshot = async () =>
    (await db.select().from(transaction)).sort((a, b) => a.id.localeCompare(b.id));

  it("edits Dec from R$ 100,00 to R$ 120,00: Oct and Nov keep 100, Dec onward lists 120", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);

    expect(
      await transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", edit(tx, "2026-12", 12000)),
    ).toBe(true);

    expect(await amountsIn("2026-10", "2026-11", "2026-12", "2027-01", "2027-06")).toEqual([
      [10000],
      [10000],
      [12000],
      [12000],
      [12000],
    ]);
  });

  it("edits Dec then Feb, then Dec again: the latest edit wins from its month on", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", edit(tx, "2026-12", 12000));
    const febId = await idIn("2027-02");
    await transactionsRepo.updateFromSealed(userId, febId, "2027-02", edit(tx, "2027-02", 15000));

    expect(await amountsIn("2026-11", "2026-12", "2027-01", "2027-02", "2027-03")).toEqual([
      [10000],
      [12000],
      [12000],
      [15000],
      [15000],
    ]);

    const id = await idIn("2026-12");
    await transactionsRepo.updateFromSealed(userId, id, "2026-12", edit(tx, "2026-12", 13000));
    expect(await amountsIn("2026-11", "2026-12", "2027-01", "2027-02", "2027-03")).toEqual([
      [10000],
      [13000],
      [13000],
      [13000],
      [13000],
    ]);
  });

  it("changes the whole series when editing the month it starts", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);

    const changed = {
      ...edit(tx, "2026-10", 9000),
      categoryId: lazer,
      descriptionCt: "v1:aluguelnovo",
    };
    expect(await transactionsRepo.updateFromSealed(userId, tx.id, "2026-10", changed)).toBe(true);

    expect(await db.$count(transaction)).toBe(1);
    for (const key of ["2026-10", "2026-11", "2027-05"]) {
      expect(await listIn(key)).toEqual([
        expect.objectContaining({
          id: tx.id,
          amountCt: "v1:a9000",
          categoryId: lazer,
          descriptionCt: "v1:aluguelnovo",
        }),
      ]);
    }
  });

  it("makes the edited month a single row and removes the following months ('Não recorrente')", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);

    const single = { ...edit(tx, "2026-12", 11000), recurrence: "none" as const };
    expect(await transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", single)).toBe(true);

    expect((await listIn("2026-11")).map((t) => [centsOf(t.amountCt), t.recurring])).toEqual([
      [10000, true],
    ]);
    expect((await listIn("2026-12")).map((t) => [centsOf(t.amountCt), t.recurring])).toEqual([
      [11000, false],
    ]);
    expect(await listIn("2027-01")).toEqual([]);
  });

  it("keeps day 31 in March after editing the 28/02 occurrence without changing the date", async () => {
    const tx = rent("2026-01-31");
    await transactionsRepo.createSealed(userId, tx);

    const feb = { ...edit(tx, "2026-02", 20000), date: "2026-02-28" };
    expect(await transactionsRepo.updateFromSealed(userId, tx.id, "2026-02", feb)).toBe(true);

    expect((await listIn("2026-03")).map((t) => [t.date, centsOf(t.amountCt)])).toEqual([
      ["2026-03-31", 20000],
    ]);
  });

  it("changes a recurring income's monthly amount from the edited month on", async () => {
    const salary: TransactionDto = {
      id: randomUUID(),
      kind: "income",
      date: "2026-10-05",
      categoryId: null,
      subcategoryId: null,
      amountCt: amountCt(500000),
      descriptionCt: "v1:salario",
      recurrence: "indefinite",
    };
    await transactionsRepo.createSealed(userId, salary);

    const raise = {
      ...salary,
      date: "2026-12-05",
      amountCt: amountCt(600000),
      newRowId: randomUUID(),
      insertedCt: { amountCt: amountCt(600000), descriptionCt: "v1:salario" },
    };
    expect(await transactionsRepo.updateFromSealed(userId, salary.id, "2026-12", raise)).toBe(true);

    expect(await amountsIn("2026-11", "2026-12", "2027-01")).toEqual([[500000], [600000], [600000]]);
  });

  it("returns false for another user's id and changes no row", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    const before = await snapshot();

    const otherId = await insertTestUser();
    expect(
      await transactionsRepo.updateFromSealed(otherId, tx.id, "2026-12", edit(tx, "2026-12", 1)),
    ).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("returns false for a month outside the segment and changes no row", async () => {
    const tx = { ...rent(), recurrence: "until" as const, recurrenceEndMonth: "2026-12" };
    await transactionsRepo.createSealed(userId, tx);
    const before = await snapshot();

    expect(
      await transactionsRepo.updateFromSealed(userId, tx.id, "2026-09", edit(tx, "2026-09", 1)),
    ).toBe(false);
    expect(
      await transactionsRepo.updateFromSealed(userId, tx.id, "2027-01", edit(tx, "2027-01", 1)),
    ).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("never lists two occurrences of the series in a month after several edits", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    const steps = ["2027-01", "2026-12", "2027-04", "2027-02", "2026-11", "2027-04"];
    for (const [i, key] of steps.entries()) {
      const id = await idIn(key);
      expect(
        await transactionsRepo.updateFromSealed(userId, id, key, edit(tx, key, 20000 + i)),
      ).toBe(true);
    }

    const keys = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"];
    expect(await amountsIn(...keys)).toEqual([
      [10000],
      [20004],
      [20004],
      [20004],
      [20004],
      [20004],
      [20005],
    ]);
  });

  it("still moves a single row to any date (current contract)", async () => {
    const tx = expense("2026-10-04", 1000);
    await transactionsRepo.createSealed(userId, tx);

    const moved = {
      ...tx,
      date: "2026-12-20",
      amountCt: amountCt(3000),
      newRowId: randomUUID(),
      insertedCt: { amountCt: amountCt(3000), descriptionCt: null },
    };
    expect(await transactionsRepo.updateFromSealed(userId, tx.id, "2026-10", moved)).toBe(true);

    expect(await listIn("2026-10")).toEqual([]);
    expect(
      (await listIn("2026-12")).map((t) => [t.id, t.date, centsOf(t.amountCt), t.recurring]),
    ).toEqual([[tx.id, "2026-12-20", 3000, false]]);
  });

  it("writes the new segment with newRowId and its insertedCt, and the edited row with amountCt", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    const dto = {
      ...edit(tx, "2026-12", 12000),
      insertedCt: { amountCt: "v1:novosegmento", descriptionCt: "v1:descnovo" },
    };

    expect(await transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", dto)).toBe(true);

    const segment = await stored(dto.newRowId);
    expect(segment).toMatchObject({
      userId,
      amountCt: "v1:novosegmento",
      descriptionCt: "v1:descnovo",
      amountCents: null,
      description: null,
      seriesId: tx.id,
      recurring: true,
      date: "2026-12-15",
    });
    expect(await db.$count(transaction)).toBe(2);
  });

  it("keeps the old ciphertext on the truncated segment and ends it in the previous month", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    const dto = edit(tx, "2026-12", 12000);

    await transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", dto);

    expect(await stored(tx.id)).toMatchObject({
      amountCt: "v1:a10000",
      descriptionCt: "v1:aluguel",
      amountCents: null,
      description: null,
      recurrenceEnd: "2026-11-01",
    });
  });

  it("stores the in-place edit as ciphertext with the plain-text columns NULL", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);

    await transactionsRepo.updateFromSealed(userId, tx.id, "2026-10", edit(tx, "2026-10", 7777));

    const row = await stored(tx.id);
    expect(row.amountCt).toBe("v1:a7777");
    expect(row.amountCt!.startsWith("v1:")).toBe(true);
    expect(row.amountCents).toBeNull();
    expect(row.description).toBeNull();
  });

  it("fails when newRowId already exists and changes nothing", async () => {
    const tx = rent();
    const other = expense("2026-11-03", 555);
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.createSealed(userId, other);
    const before = await snapshot();

    const dto = { ...edit(tx, "2026-12", 12000), newRowId: other.id };
    await expect(transactionsRepo.updateFromSealed(userId, tx.id, "2026-12", dto)).rejects.toThrow();

    expect(await snapshot()).toEqual(before);
  });
});

describe("transactionsRepo sealed subcategory", () => {
  let restaurante: string;
  let streaming: string;

  beforeEach(async () => {
    [restaurante, streaming] = (
      await db
        .insert(subcategory)
        .values([
          { userId, categoryId: conforto, nameCt: "v1:restaurante" },
          { userId, categoryId: conforto, nameCt: "v1:streaming" },
        ])
        .returning({ id: subcategory.id })
    ).map((s) => s.id);
  });

  it("stores the subcategory on create and returns it from listByMonthSealed", async () => {
    const withSub = { ...expense("2026-10-04", 8000), subcategoryId: restaurante };
    const withoutSub = expense("2026-10-03", 4000);
    await transactionsRepo.createSealed(userId, withSub);
    await transactionsRepo.createSealed(userId, withoutSub);

    const listed = await transactionsRepo.listByMonthSealed(userId, OCTOBER);
    expect(listed.map((t) => [t.id, t.subcategoryId])).toEqual([
      [withSub.id, restaurante],
      [withoutSub.id, null],
    ]);
  });

  it("applies category, subcategory, description and day of a mid-series edit from that month on", async () => {
    const tx: TransactionDto = {
      ...expense("2026-10-15", 10000),
      subcategoryId: restaurante,
      descriptionCt: "v1:aluguel",
      recurrence: "indefinite",
    };
    await transactionsRepo.createSealed(userId, tx);
    const month = (y: number, m: number) => monthRange({ year: y, month: m });
    const first = async (y: number, m: number) =>
      (await transactionsRepo.listByMonthSealed(userId, month(y, m)))[0];
    const fields = (t: Awaited<ReturnType<typeof first>>) => [
      t.kind,
      t.categoryId,
      t.subcategoryId,
      t.descriptionCt,
      t.date,
    ];
    const dto = (over: Partial<UpdateTransactionDto>): UpdateTransactionDto => ({
      ...tx,
      newRowId: randomUUID(),
      insertedCt: { amountCt: tx.amountCt, descriptionCt: "v1:streaming" },
      ...over,
    });

    expect(
      await transactionsRepo.updateFromSealed(
        userId,
        tx.id,
        "2026-12",
        dto({ date: "2026-12-20", subcategoryId: streaming }),
      ),
    ).toBe(true);
    const dec = await first(2026, 12);
    const jan = await first(2027, 1);
    const nov = await first(2026, 11);
    expect(fields(dec)).toEqual(["expense", conforto, streaming, "v1:streaming", "2026-12-20"]);
    expect(fields(jan)).toEqual(["expense", conforto, streaming, "v1:streaming", "2027-01-20"]);
    expect(fields(nov)).toEqual(["expense", conforto, restaurante, "v1:aluguel", "2026-11-15"]);

    expect(
      await transactionsRepo.updateFromSealed(
        userId,
        jan.id,
        "2027-01",
        dto({
          date: "2027-01-20",
          categoryId: lazer,
          subcategoryId: null,
          insertedCt: { amountCt: tx.amountCt, descriptionCt: "v1:cinema" },
        }),
      ),
    ).toBe(true);
    expect(fields(await first(2027, 2))).toEqual(["expense", lazer, null, "v1:cinema", "2027-02-20"]);
  });
});

describe("transactionsRepo sealed start month of an 'until' series", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string) => transactionsRepo.listByMonthSealed(userId, month(key));
  const until = (date: string, start: string, end: string): TransactionDto => ({
    ...expense(date, 4000),
    recurrence: "until",
    recurrenceStartMonth: start,
    recurrenceEndMonth: end,
  });
  const editOf = (tx: TransactionDto, over: Partial<UpdateTransactionDto> = {}): UpdateTransactionDto => ({
    ...tx,
    newRowId: randomUUID(),
    insertedCt: { amountCt: tx.amountCt, descriptionCt: null },
    ...over,
  });

  it("clamps day 31 to the last day of a 30-day start month and keeps day 31 as the intended day", async () => {
    const tx = until("2026-01-31", "2026-04", "2026-06");
    await transactionsRepo.createSealed(userId, tx);

    expect(await stored(tx.id)).toMatchObject({ date: "2026-04-30", recurrenceDay: 31 });
    expect((await listIn("2026-05")).map((t) => t.date)).toEqual(["2026-05-31"]);
  });

  it("ignores the start month for 'indefinite' and non-recurring rows", async () => {
    const forever: TransactionDto = {
      ...expense("2026-04-10"),
      recurrence: "indefinite",
      recurrenceStartMonth: "2026-08",
    };
    const none: TransactionDto = { ...expense("2026-04-12"), recurrenceStartMonth: "2026-08" };
    await transactionsRepo.createSealed(userId, forever);
    await transactionsRepo.createSealed(userId, none);

    expect((await stored(forever.id)).date).toBe("2026-04-10");
    expect((await stored(none.id)).date).toBe("2026-04-12");
  });

  it("moves the start when editing the first month of the series", async () => {
    const tx = until("2026-04-10", "2026-04", "2026-12");
    await transactionsRepo.createSealed(userId, tx);

    expect(
      await transactionsRepo.updateFromSealed(userId, tx.id, "2026-04", editOf(tx, { recurrenceStartMonth: "2026-06" })),
    ).toBe(true);

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(tx.id)).toMatchObject({ date: "2026-06-10", recurrenceEnd: "2026-12-01" });
    expect(await listIn("2026-05")).toEqual([]);
    expect((await listIn("2026-06")).map((t) => t.date)).toEqual(["2026-06-10"]);
  });

  it("ignores the start month sent when editing a month in the middle of the series", async () => {
    const tx = until("2026-04-10", "2026-04", "2026-12");
    await transactionsRepo.createSealed(userId, tx);

    await transactionsRepo.updateFromSealed(
      userId,
      tx.id,
      "2026-08",
      editOf(tx, {
        date: "2026-08-10",
        amountCt: amountCt(5000),
        insertedCt: { amountCt: amountCt(5000), descriptionCt: null },
        recurrenceStartMonth: "2026-02",
      }),
    );

    const rows = await db.select().from(transaction);
    expect(rows.map((r) => [r.date, r.recurrenceEnd, r.amountCt]).sort()).toEqual([
      ["2026-04-10", "2026-07-01", amountCt(4000)],
      ["2026-08-10", "2026-12-01", amountCt(5000)],
    ]);
  });

  it("starts at the chosen month when a single row becomes an 'until' series", async () => {
    const single = expense("2026-04-10", 4000);
    await transactionsRepo.createSealed(userId, single);

    await transactionsRepo.updateFromSealed(
      userId,
      single.id,
      "2026-04",
      editOf(single, { recurrence: "until", recurrenceStartMonth: "2026-05", recurrenceEndMonth: "2026-07" }),
    );

    expect(await stored(single.id)).toMatchObject({
      date: "2026-05-10",
      recurring: true,
      recurrenceEnd: "2026-07-01",
    });
  });
});
