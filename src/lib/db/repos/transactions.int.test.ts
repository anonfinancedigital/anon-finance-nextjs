import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { monthRange } from "@/lib/domain/month";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { transaction } from "../schema";
import { categoriesRepo } from "./categories";
import { transactionsRepo } from "./transactions";

setupTestDb();

const OCTOBER = monthRange({ year: 2026, month: 10 });

let userId: string;
let conforto: string;
let lazer: string;

beforeEach(async () => {
  userId = await insertTestUser();
  await categoriesRepo.replaceSet(userId, [
    { name: "Conforto", percentBp: 6000, color: 1 },
    { name: "Lazer", percentBp: 4000, color: 2 },
  ]);
  [conforto, lazer] = (await categoriesRepo.list(userId)).map((c) => c.id);
});

const expense = (date: string, amountCents = 1000) => ({
  id: randomUUID(),
  kind: "expense" as const,
  amountCents,
  date,
  categoryId: conforto,
  description: null,
});

describe("transactionsRepo.create", () => {
  it("creates only one row when the same id is sent twice", async () => {
    const tx = expense("2026-10-04", 20000);
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.create(userId, { ...tx, amountCents: 99900 });

    const rows = await db.select().from(transaction);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: tx.id, userId, amountCents: 20000 });
  });
});

describe("transactionsRepo.create recurrence", () => {
  const stored = async (id: string) =>
    (await db.select().from(transaction)).find((r) => r.id === id)!;

  it("stores a 'forever' expense as one recurring row with day, series = id and no end", async () => {
    const tx = { ...expense("2026-10-15", 10000), recurrence: "forever" as const };
    await transactionsRepo.create(userId, tx);

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(tx.id)).toMatchObject({
      recurring: true,
      recurrenceDay: 15,
      seriesId: tx.id,
      recurrenceEnd: null,
      date: "2026-10-15",
      amountCents: 10000,
    });
  });

  it("stores an 'until' expense with recurrence_end = first day of the final month", async () => {
    const tx = {
      ...expense("2026-10-31"),
      recurrence: "until" as const,
      recurrenceEndMonth: "2027-03",
    };
    await transactionsRepo.create(userId, tx);

    expect(await stored(tx.id)).toMatchObject({
      recurring: true,
      recurrenceDay: 31,
      seriesId: tx.id,
      recurrenceEnd: "2027-03-01",
    });
  });

  it("stores a non-recurring row with recurring = false and the other fields null", async () => {
    const tx = { ...expense("2026-10-15"), recurrence: "none" as const, recurrenceEndMonth: null };
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.create(userId, { ...tx, recurrence: "forever" as const });

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(tx.id)).toMatchObject({
      recurring: false,
      recurrenceDay: null,
      seriesId: null,
      recurrenceEnd: null,
    });
  });

  it("stores a recurring income", async () => {
    const tx = {
      id: randomUUID(),
      kind: "income" as const,
      amountCents: 500000,
      date: "2026-10-05",
      recurrence: "forever" as const,
    };
    await transactionsRepo.create(userId, tx);

    expect(await stored(tx.id)).toMatchObject({
      kind: "income",
      categoryId: null,
      recurring: true,
      recurrenceDay: 5,
      seriesId: tx.id,
    });
  });
});

describe("transactionsRepo.listByMonth", () => {
  it("returns only the month's transactions, latest date first", async () => {
    const sep30 = expense("2026-09-30");
    const oct01 = expense("2026-10-01");
    const oct15 = expense("2026-10-15");
    const oct31 = expense("2026-10-31");
    const nov01 = expense("2026-11-01");
    for (const tx of [oct15, sep30, oct01, nov01, oct31]) await transactionsRepo.create(userId, tx);

    const listed = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(listed.map((t) => t.id)).toEqual([oct31.id, oct15.id, oct01.id]);
  });

  it("orders same-day transactions by most recently created first", async () => {
    const first = expense("2026-10-10");
    const second = expense("2026-10-10");
    await transactionsRepo.create(userId, first);
    await transactionsRepo.create(userId, second);

    const listed = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(listed.map((t) => t.id)).toEqual([second.id, first.id]);
  });

  it("returns the transaction fields and ignores other users", async () => {
    const income = {
      id: randomUUID(),
      kind: "income" as const,
      amountCents: 500000,
      date: "2026-10-05",
      categoryId: null,
      description: "Salário",
    };
    await transactionsRepo.create(userId, income);
    await transactionsRepo.create(await insertTestUser(), expense("2026-10-06"));

    const listed = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(listed).toEqual([expect.objectContaining(income)]);
  });
});

describe("transactionsRepo.listByMonth recurrence", () => {
  const month = (year: number, m: number) => monthRange({ year, month: m });
  const recurringExpense = (date: string, amountCents: number, recurrenceEndMonth?: string) => ({
    ...expense(date, amountCents),
    description: "Aluguel",
    recurrence: recurrenceEndMonth ? ("until" as const) : ("forever" as const),
    recurrenceEndMonth: recurrenceEndMonth ?? null,
  });

  it("lists in November the occurrence of a 'forever' expense of 15/10 on 15/11", async () => {
    const tx = recurringExpense("2026-10-15", 10000);
    await transactionsRepo.create(userId, tx);

    expect(await transactionsRepo.listByMonth(userId, month(2026, 11))).toEqual([
      expect.objectContaining({
        id: tx.id,
        kind: "expense",
        date: "2026-11-15",
        amountCents: 10000,
        categoryId: conforto,
        description: "Aluguel",
        recurring: true,
        recurrenceEnd: null,
        month: "2026-11",
      }),
    ]);
  });

  it("lists an expense of day 31 on 28/02/2026 in February", async () => {
    await transactionsRepo.create(userId, recurringExpense("2026-01-31", 5000));

    const [occurrence] = await transactionsRepo.listByMonth(userId, month(2026, 2));
    expect(occurrence.date).toBe("2026-02-28");
  });

  it("lists the occurrence only between the month of the date and the final month", async () => {
    const tx = recurringExpense("2026-10-15", 10000, "2026-12");
    await transactionsRepo.create(userId, tx);

    const ids = async (y: number, m: number) =>
      (await transactionsRepo.listByMonth(userId, month(y, m))).map((t) => t.id);
    expect(await ids(2026, 9)).toEqual([]);
    expect(await ids(2026, 10)).toEqual([tx.id]);
    expect(await ids(2026, 12)).toEqual([tx.id]);
    expect(await ids(2027, 1)).toEqual([]);
  });

  it("marks recurring occurrences with their final month and single rows as not recurring", async () => {
    const recurring = recurringExpense("2026-10-15", 10000, "2027-03");
    const single = expense("2026-11-02");
    await transactionsRepo.create(userId, recurring);
    await transactionsRepo.create(userId, single);

    const listed = await transactionsRepo.listByMonth(userId, month(2026, 11));
    expect(listed.map((t) => [t.id, t.recurring, t.recurrenceEnd, t.month])).toEqual([
      [recurring.id, true, "2027-03-01", "2026-11"],
      [single.id, false, null, "2026-11"],
    ]);
  });

  it("mixes single and recurring rows by projected date desc, ties by most recently created", async () => {
    const recurring = recurringExpense("2026-10-15", 10000);
    const nov03 = expense("2026-11-03");
    const nov15 = expense("2026-11-15");
    const nov20 = expense("2026-11-20");
    for (const tx of [recurring, nov03, nov15, nov20]) await transactionsRepo.create(userId, tx);

    const listed = await transactionsRepo.listByMonth(userId, month(2026, 11));
    expect(listed.map((t) => t.id)).toEqual([nov20.id, nov15.id, recurring.id, nov03.id]);
  });

  it("lists the same expense total as monthTotals for the month (AD-004)", async () => {
    await transactionsRepo.create(userId, recurringExpense("2026-10-15", 10000));
    await transactionsRepo.create(userId, recurringExpense("2026-09-30", 3300, "2026-11"));
    await transactionsRepo.create(userId, recurringExpense("2026-08-01", 4400, "2026-10"));
    await transactionsRepo.create(userId, { ...expense("2026-11-02", 2500), categoryId: lazer });
    await transactionsRepo.create(userId, expense("2026-12-01", 99900));

    const range = month(2026, 11);
    const listed = await transactionsRepo.listByMonth(userId, range);
    const listedSpent = listed
      .filter((t) => t.kind === "expense")
      .reduce((sum, t) => sum + t.amountCents, 0);
    const totals = await transactionsRepo.monthTotals(userId, range);
    const totalSpent = [...totals.spentByCategory.values()].reduce((a, b) => a + b, 0);
    expect(listedSpent).toBe(15800);
    expect(totalSpent).toBe(listedSpent);
  });
});

describe("transactionsRepo.update", () => {
  it("changes date, amount, category and description", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.create(userId, tx);

    const changed = {
      kind: "expense" as const,
      amountCents: 4550,
      date: "2026-10-20",
      categoryId: lazer,
      description: "Cinema",
    };
    expect(await transactionsRepo.update(userId, tx.id, changed)).toBe(true);

    const [row] = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(row).toMatchObject({ id: tx.id, ...changed });
  });

  it("keeps the value of the last of two consecutive updates", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.update(userId, tx.id, { ...tx, amountCents: 1111 });
    await transactionsRepo.update(userId, tx.id, { ...tx, amountCents: 2222 });

    const [row] = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(row.amountCents).toBe(2222);
  });

  it("does not touch a transaction of another user", async () => {
    const tx = expense("2026-10-04", 1000);
    await transactionsRepo.create(userId, tx);
    const otherId = await insertTestUser();

    expect(await transactionsRepo.update(otherId, tx.id, { ...tx, amountCents: 9999 })).toBe(false);
    const [row] = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(row.amountCents).toBe(1000);
  });
});

describe("transactionsRepo.delete", () => {
  it("removes the transaction", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.create(userId, tx);

    expect(await transactionsRepo.delete(userId, tx.id)).toBe(true);
    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toEqual([]);
  });

  it("does not remove a transaction of another user", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.create(userId, tx);

    expect(await transactionsRepo.delete(await insertTestUser(), tx.id)).toBe(false);
    expect((await transactionsRepo.listByMonth(userId, OCTOBER)).map((t) => t.id)).toEqual([tx.id]);
  });
});

describe("transactionsRepo.monthTotals", () => {
  const income = (date: string, amountCents: number) => ({
    id: randomUUID(),
    kind: "income" as const,
    amountCents,
    date,
  });
  const spend = (categoryId: string, date: string, amountCents: number) => ({
    ...expense(date, amountCents),
    categoryId,
  });

  it("sums the month's income and spending per category, leaving other months out", async () => {
    for (const tx of [
      income("2026-10-01", 300000),
      income("2026-10-20", 200000),
      spend(conforto, "2026-10-02", 10000),
      spend(conforto, "2026-10-31", 5000),
      spend(lazer, "2026-10-15", 2500),
      spend(conforto, "2026-11-01", 99900),
    ]) {
      await transactionsRepo.create(userId, tx);
    }

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.incomeCents).toBe(500000);
    expect(totals.spentByCategory).toEqual(
      new Map([
        [conforto, 15000],
        [lazer, 2500],
      ]),
    );
  });

  it("returns zero income and an empty map for a month without transactions", async () => {
    await transactionsRepo.create(userId, spend(conforto, "2026-09-30", 1000));

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.incomeCents).toBe(0);
    expect(totals.spentByCategory).toEqual(new Map());
  });

  it("ignores transactions of other users", async () => {
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentBp: 10000, color: 1 }]);
    const [tudo] = await categoriesRepo.list(otherId);
    await transactionsRepo.create(otherId, income("2026-10-01", 700000));
    await transactionsRepo.create(otherId, spend(tudo.id, "2026-10-02", 3000));
    await transactionsRepo.create(userId, income("2026-10-01", 100000));

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.incomeCents).toBe(100000);
    expect(totals.spentByCategory).toEqual(new Map());
  });
});

describe("transactionsRepo.monthTotals recurrence", () => {
  const month = (year: number, m: number) => monthRange({ year, month: m });
  const spentIn = async (range: ReturnType<typeof monthRange>) =>
    (await transactionsRepo.monthTotals(userId, range)).spentByCategory.get(conforto) ?? 0;
  const recurringExpense = (date: string, amountCents: number, recurrenceEndMonth?: string) => ({
    ...expense(date, amountCents),
    recurrence: recurrenceEndMonth ? ("until" as const) : ("forever" as const),
    recurrenceEndMonth: recurrenceEndMonth ?? null,
  });

  it("sums a 'forever' expense of 15/10 in Oct, Nov and Dec/2026 but not in Sep/2026", async () => {
    await transactionsRepo.create(userId, recurringExpense("2026-10-15", 10000));

    expect(await spentIn(month(2026, 9))).toBe(0);
    expect(await spentIn(month(2026, 10))).toBe(10000);
    expect(await spentIn(month(2026, 11))).toBe(10000);
    expect(await spentIn(month(2026, 12))).toBe(10000);
    expect(await spentIn(month(2030, 6))).toBe(10000);
  });

  it("sums an 'until' expense through the final month, inclusive, and not after", async () => {
    await transactionsRepo.create(userId, recurringExpense("2026-10-15", 10000, "2026-12"));

    expect(await spentIn(month(2026, 12))).toBe(10000);
    expect(await spentIn(month(2027, 1))).toBe(0);
  });

  it("adds a recurring income to the income of each applicable month", async () => {
    await transactionsRepo.create(userId, {
      id: randomUUID(),
      kind: "income",
      amountCents: 500000,
      date: "2026-10-05",
      recurrence: "forever",
    });
    await transactionsRepo.create(userId, {
      id: randomUUID(),
      kind: "income",
      amountCents: 1000,
      date: "2026-11-20",
    });

    expect((await transactionsRepo.monthTotals(userId, month(2026, 9))).incomeCents).toBe(0);
    expect((await transactionsRepo.monthTotals(userId, month(2026, 10))).incomeCents).toBe(500000);
    expect((await transactionsRepo.monthTotals(userId, month(2026, 11))).incomeCents).toBe(501000);
  });

  it("sums a recurring expense with the single expenses of the same month and category", async () => {
    await transactionsRepo.create(userId, recurringExpense("2026-10-15", 10000));
    await transactionsRepo.create(userId, expense("2026-11-02", 2500));
    await transactionsRepo.create(userId, expense("2026-10-02", 700));

    expect(await spentIn(month(2026, 11))).toBe(12500);
    expect(await spentIn(month(2026, 10))).toBe(10700);
  });

  it("leaves recurring transactions of other users out", async () => {
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentBp: 10000, color: 1 }]);
    const [tudo] = await categoriesRepo.list(otherId);
    await transactionsRepo.create(otherId, {
      ...recurringExpense("2026-10-15", 9000),
      categoryId: tudo.id,
    });
    await transactionsRepo.create(otherId, {
      id: randomUUID(),
      kind: "income",
      amountCents: 700000,
      date: "2026-10-01",
      recurrence: "forever",
    });

    const totals = await transactionsRepo.monthTotals(userId, month(2026, 11));
    expect(totals.incomeCents).toBe(0);
    expect(totals.spentByCategory).toEqual(new Map());
  });
});

describe("transactionsRepo subcategory", () => {
  let restaurante: string;
  let streaming: string;

  beforeEach(async () => {
    const saved = await categoriesRepo.list(userId);
    await categoriesRepo.replaceSet(
      userId,
      saved.map((c) =>
        c.id === conforto
          ? { ...c, subcategories: [{ name: "Restaurante" }, { name: "Streaming" }] }
          : c,
      ),
    );
    [restaurante, streaming] = (await categoriesRepo.list(userId))[0].subcategories.map((s) => s.id);
  });

  const spend = (subcategoryId: string | null, date: string, amountCents: number) => ({
    ...expense(date, amountCents),
    subcategoryId,
  });

  it("stores the subcategory on create and returns it from listByMonth", async () => {
    const withSub = spend(restaurante, "2026-10-04", 8000);
    const withoutSub = spend(null, "2026-10-03", 4000);
    await transactionsRepo.create(userId, withSub);
    await transactionsRepo.create(userId, withoutSub);

    const listed = await transactionsRepo.listByMonth(userId, OCTOBER);
    expect(listed.map((t) => [t.id, t.subcategoryId])).toEqual([
      [withSub.id, restaurante],
      [withoutSub.id, null],
    ]);
  });

  it("changes the subcategory on update and clears it with null", async () => {
    const tx = spend(restaurante, "2026-10-04", 8000);
    await transactionsRepo.create(userId, tx);

    await transactionsRepo.update(userId, tx.id, { ...tx, subcategoryId: streaming });
    expect((await transactionsRepo.listByMonth(userId, OCTOBER))[0].subcategoryId).toBe(streaming);

    await transactionsRepo.update(userId, tx.id, { ...tx, subcategoryId: null });
    expect((await transactionsRepo.listByMonth(userId, OCTOBER))[0].subcategoryId).toBeNull();
  });

  it("totals expenses with and without subcategory under separate keys of the same category", async () => {
    for (const tx of [
      spend(restaurante, "2026-10-02", 30000),
      spend(restaurante, "2026-10-09", 5000),
      spend(streaming, "2026-10-10", 10000),
      spend(null, "2026-10-11", 10000),
    ]) {
      await transactionsRepo.create(userId, tx);
    }

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.spentBySubcategory).toEqual(
      new Map([
        [
          conforto,
          new Map<string | null, number>([
            [restaurante, 35000],
            [streaming, 10000],
            [null, 10000],
          ]),
        ],
      ]),
    );
    expect(totals.spentByCategory).toEqual(new Map([[conforto, 55000]]));
  });

  it("leaves other months and other users out of the subcategory totals", async () => {
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentBp: 10000, color: 1 }]);
    const [tudo] = await categoriesRepo.list(otherId);
    await transactionsRepo.create(otherId, { ...expense("2026-10-02", 7000), categoryId: tudo.id });
    await transactionsRepo.create(userId, spend(restaurante, "2026-11-01", 99900));
    await transactionsRepo.create(userId, spend(restaurante, "2026-10-02", 2000));

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.spentBySubcategory).toEqual(
      new Map([[conforto, new Map<string | null, number>([[restaurante, 2000]])]]),
    );
  });
});
