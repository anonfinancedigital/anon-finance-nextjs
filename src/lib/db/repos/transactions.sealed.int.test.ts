import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { monthRange } from "@/lib/domain/month";
import type { TransactionDto } from "@/lib/vault/types";
import { insertCategory, insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { transaction } from "../schema";
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
        installment: null,
        seriesStart: null,
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
