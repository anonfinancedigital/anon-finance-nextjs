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
    { name: "Conforto", percentMicro: 60000000, color: 1 },
    { name: "Lazer", percentMicro: 40000000, color: 2 },
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

describe("transactionsRepo.updateFrom", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string) => transactionsRepo.listByMonth(userId, month(key));
  /** Id of the only occurrence listed in the month. */
  const idIn = async (key: string) => {
    const listed = await listIn(key);
    expect(listed).toHaveLength(1);
    return listed[0].id;
  };
  const amountsIn = async (...keys: string[]) =>
    Promise.all(keys.map(async (k) => (await listIn(k)).map((t) => t.amountCents)));
  const rent = (date = "2026-10-15", amountCents = 10000) => ({
    ...expense(date, amountCents),
    description: "Aluguel",
    recurrence: "forever" as "forever" | "until" | "none",
    recurrenceEndMonth: null as string | null,
  });
  /** Edit data for the occurrence of `key`, keeping the day of `base`. */
  const edit = (base: ReturnType<typeof rent>, key: string, amountCents: number) => ({
    ...base,
    date: `${key}-${base.date.slice(8)}`,
    amountCents,
  });
  const snapshot = async () =>
    (await db.select().from(transaction)).sort((a, b) => a.id.localeCompare(b.id));

  it("edits Dec from R$ 100,00 to R$ 120,00: Oct and Nov keep 100, Dec onward lists 120", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);

    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-12", edit(tx, "2026-12", 12000)))
      .toBe(true);

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
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.updateFrom(userId, tx.id, "2026-12", edit(tx, "2026-12", 12000));
    const febId = await idIn("2027-02");
    await transactionsRepo.updateFrom(userId, febId, "2027-02", edit(tx, "2027-02", 15000));

    expect(await amountsIn("2026-11", "2026-12", "2027-01", "2027-02", "2027-03")).toEqual([
      [10000],
      [12000],
      [12000],
      [15000],
      [15000],
    ]);

    const id = await idIn("2026-12");
    await transactionsRepo.updateFrom(userId, id, "2026-12", edit(tx, "2026-12", 13000));
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
    await transactionsRepo.create(userId, tx);

    const changed = { ...tx, amountCents: 9000, categoryId: lazer, description: "Aluguel novo" };
    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-10", changed)).toBe(true);

    expect(await db.$count(transaction)).toBe(1);
    for (const key of ["2026-10", "2026-11", "2027-05"]) {
      expect(await listIn(key)).toEqual([
        expect.objectContaining({
          id: tx.id,
          amountCents: 9000,
          categoryId: lazer,
          description: "Aluguel novo",
        }),
      ]);
    }
  });

  it("makes the edited month a single row and removes the following months ('Não recorrente')", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);

    const single = { ...edit(tx, "2026-12", 11000), recurrence: "none" as const };
    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-12", single)).toBe(true);

    expect((await listIn("2026-11")).map((t) => [t.amountCents, t.recurring])).toEqual([
      [10000, true],
    ]);
    expect((await listIn("2026-12")).map((t) => [t.amountCents, t.recurring])).toEqual([
      [11000, false],
    ]);
    expect(await listIn("2027-01")).toEqual([]);
  });

  it("keeps day 31 in March after editing the 28/02 occurrence without changing the date", async () => {
    const tx = rent("2026-01-31");
    await transactionsRepo.create(userId, tx);

    const feb = { ...tx, date: "2026-02-28", amountCents: 20000 };
    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-02", feb)).toBe(true);

    expect((await listIn("2026-03")).map((t) => [t.date, t.amountCents])).toEqual([
      ["2026-03-31", 20000],
    ]);
  });

  it("changes a recurring income's monthly income from the edited month on", async () => {
    const salary = {
      id: randomUUID(),
      kind: "income" as const,
      amountCents: 500000,
      date: "2026-10-05",
      description: "Salário",
      recurrence: "forever" as const,
    };
    await transactionsRepo.create(userId, salary);

    const raise = { ...salary, date: "2026-12-05", amountCents: 600000 };
    expect(await transactionsRepo.updateFrom(userId, salary.id, "2026-12", raise)).toBe(true);

    const income = async (key: string) =>
      (await transactionsRepo.monthTotals(userId, month(key))).incomeCents;
    expect([await income("2026-11"), await income("2026-12"), await income("2027-01")]).toEqual([
      500000, 600000, 600000,
    ]);
  });

  it("returns false for another user's id and changes no row", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);
    const before = await snapshot();

    const otherId = await insertTestUser();
    expect(await transactionsRepo.updateFrom(otherId, tx.id, "2026-12", edit(tx, "2026-12", 1)))
      .toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("returns false for a month outside the segment and changes no row", async () => {
    const tx = { ...rent(), recurrence: "until" as const, recurrenceEndMonth: "2026-12" };
    await transactionsRepo.create(userId, tx);
    const before = await snapshot();

    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-09", edit(tx, "2026-09", 1)))
      .toBe(false);
    expect(await transactionsRepo.updateFrom(userId, tx.id, "2027-01", edit(tx, "2027-01", 1)))
      .toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("never lists two occurrences of the series in a month after several edits", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);
    const steps = ["2027-01", "2026-12", "2027-04", "2027-02", "2026-11", "2027-04"];
    for (const [i, key] of steps.entries()) {
      const id = await idIn(key);
      expect(await transactionsRepo.updateFrom(userId, id, key, edit(tx, key, 20000 + i)))
        .toBe(true);
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
    await transactionsRepo.create(userId, tx);

    const moved = { ...tx, date: "2026-12-20", amountCents: 3000 };
    expect(await transactionsRepo.updateFrom(userId, tx.id, "2026-10", moved)).toBe(true);

    expect(await listIn("2026-10")).toEqual([]);
    expect((await listIn("2026-12")).map((t) => [t.id, t.date, t.amountCents, t.recurring]))
      .toEqual([[tx.id, "2026-12-20", 3000, false]]);
  });
});

describe("transactionsRepo.deleteFrom", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string) => transactionsRepo.listByMonth(userId, month(key));
  const amountsIn = async (...keys: string[]) =>
    Promise.all(keys.map(async (k) => (await listIn(k)).map((t) => t.amountCents)));
  const rent = () => ({
    ...expense("2026-10-15", 10000),
    recurrence: "forever" as "forever" | "until",
    recurrenceEndMonth: null as string | null,
  });
  const snapshot = async () =>
    (await db.select().from(transaction)).sort((a, b) => a.id.localeCompare(b.id));

  it("deletes a 'forever' income of Oct from Dec on: Oct and Nov keep it, Dec onward not", async () => {
    const salary = {
      id: randomUUID(),
      kind: "income" as const,
      amountCents: 500000,
      date: "2026-10-05",
      recurrence: "forever" as const,
    };
    await transactionsRepo.create(userId, salary);

    expect(await transactionsRepo.deleteFrom(userId, salary.id, "2026-12")).toBe(true);

    expect(await amountsIn("2026-10", "2026-11", "2026-12", "2027-01")).toEqual([
      [500000],
      [500000],
      [],
      [],
    ]);
  });

  it("removes the transaction from every month when deleting in the month it starts", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);

    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2026-10")).toBe(true);

    expect(await db.$count(transaction)).toBe(0);
    expect(await amountsIn("2026-10", "2026-11", "2027-06")).toEqual([[], [], []]);
  });

  it("after series edits, deletes the edited segment and later ones, keeping the earlier one", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.updateFrom(userId, tx.id, "2026-12", {
      ...tx,
      date: "2026-12-15",
      amountCents: 12000,
    });
    const [dec] = await listIn("2026-12");
    await transactionsRepo.updateFrom(userId, dec.id, "2027-02", {
      ...tx,
      date: "2027-02-15",
      amountCents: 15000,
    });

    expect(await transactionsRepo.deleteFrom(userId, dec.id, "2026-12")).toBe(true);

    expect(await amountsIn("2026-10", "2026-11", "2026-12", "2027-02")).toEqual([
      [10000],
      [10000],
      [],
      [],
    ]);
    expect((await db.select().from(transaction)).map((r) => [r.id, r.recurrenceEnd])).toEqual([
      [tx.id, "2026-11-01"],
    ]);
  });

  it("returns false for another user's id and changes no row", async () => {
    const tx = rent();
    await transactionsRepo.create(userId, tx);
    const before = await snapshot();

    expect(await transactionsRepo.deleteFrom(await insertTestUser(), tx.id, "2026-12")).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("returns false for a month outside the segment and changes no row", async () => {
    const tx = { ...rent(), recurrence: "until" as const, recurrenceEndMonth: "2026-12" };
    await transactionsRepo.create(userId, tx);
    const before = await snapshot();

    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2026-09")).toBe(false);
    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2027-01")).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("still blocks deleting a category that has a recurring expense", async () => {
    await transactionsRepo.create(userId, rent());
    const before = await categoriesRepo.list(userId);
    const next = before
      .filter((c) => c.id !== conforto)
      .map((c) => ({ ...c, percentMicro: 100000000 }));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({
      ok: false,
      error: "Esta categoria tem 1 gasto e não pode ser excluída",
    });
    expect(await categoriesRepo.list(userId)).toEqual(before);
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
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentMicro: 100000000, color: 1 }]);
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
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentMicro: 100000000, color: 1 }]);
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

  it("applies category, subcategory, description and day of a mid-series edit from that month on", async () => {
    const tx = {
      ...spend(restaurante, "2026-10-15", 10000),
      description: "Aluguel",
      recurrence: "forever" as const,
      recurrenceEndMonth: null,
    };
    await transactionsRepo.create(userId, tx);
    const fields = (t: Awaited<ReturnType<typeof transactionsRepo.listByMonth>>[number]) => [
      t.kind,
      t.categoryId,
      t.subcategoryId,
      t.description,
      t.date,
    ];

    expect(
      await transactionsRepo.updateFrom(userId, tx.id, "2026-12", {
        ...tx,
        date: "2026-12-20",
        subcategoryId: streaming,
        description: "Streaming",
      }),
    ).toBe(true);
    const [dec] = await transactionsRepo.listByMonth(userId, monthRange({ year: 2026, month: 12 }));
    const [jan] = await transactionsRepo.listByMonth(userId, monthRange({ year: 2027, month: 1 }));
    const [nov] = await transactionsRepo.listByMonth(userId, monthRange({ year: 2026, month: 11 }));

    expect(fields(dec)).toEqual(["expense", conforto, streaming, "Streaming", "2026-12-20"]);
    expect(fields(jan)).toEqual(["expense", conforto, streaming, "Streaming", "2027-01-20"]);
    expect(fields(nov)).toEqual(["expense", conforto, restaurante, "Aluguel", "2026-11-15"]);

    expect(
      await transactionsRepo.updateFrom(userId, jan.id, "2027-01", {
        ...tx,
        date: "2027-01-20",
        categoryId: lazer,
        subcategoryId: null,
        description: "Cinema",
      }),
    ).toBe(true);
    const [feb] = await transactionsRepo.listByMonth(userId, monthRange({ year: 2027, month: 2 }));
    expect(fields(feb)).toEqual(["expense", lazer, null, "Cinema", "2027-02-20"]);
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
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentMicro: 100000000, color: 1 }]);
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

describe("transactionsRepo start month of an 'until' series", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string) => transactionsRepo.listByMonth(userId, month(key));
  const stored = async (id: string) =>
    (await db.select().from(transaction)).find((r) => r.id === id)!;
  const until = (date: string, start: string, end: string) => ({
    ...expense(date, 4000),
    recurrence: "until" as const,
    recurrenceStartMonth: start,
    recurrenceEndMonth: end,
  });

  it("creates the first occurrence on the day of the date in the start month", async () => {
    const tx = until("2026-04-10", "2026-05", "2026-12");
    await transactionsRepo.create(userId, tx);

    expect(await stored(tx.id)).toMatchObject({
      date: "2026-05-10",
      recurrenceDay: 10,
      recurrenceEnd: "2026-12-01",
    });
    expect(await listIn("2026-04")).toEqual([]);
    expect((await listIn("2026-05")).map((t) => t.date)).toEqual(["2026-05-10"]);
    expect((await listIn("2026-12")).map((t) => t.date)).toEqual(["2026-12-10"]);
  });

  it("clamps day 31 to the last day of a 30-day start month and keeps day 31 as the intended day", async () => {
    const tx = until("2026-01-31", "2026-04", "2026-06");
    await transactionsRepo.create(userId, tx);

    expect(await stored(tx.id)).toMatchObject({ date: "2026-04-30", recurrenceDay: 31 });
    expect((await listIn("2026-05")).map((t) => t.date)).toEqual(["2026-05-31"]);
  });

  it("ignores the start month for 'forever' and non-recurring rows", async () => {
    const forever = { ...expense("2026-04-10"), recurrence: "forever" as const, recurrenceStartMonth: "2026-08" };
    const none = { ...expense("2026-04-12"), recurrence: "none" as const, recurrenceStartMonth: "2026-08" };
    await transactionsRepo.create(userId, forever);
    await transactionsRepo.create(userId, none);

    expect((await stored(forever.id)).date).toBe("2026-04-10");
    expect((await stored(none.id)).date).toBe("2026-04-12");
  });

  it("moves the start when editing the first month of the series", async () => {
    const tx = until("2026-04-10", "2026-04", "2026-12");
    await transactionsRepo.create(userId, tx);

    expect(
      await transactionsRepo.updateFrom(userId, tx.id, "2026-04", {
        ...tx,
        recurrenceStartMonth: "2026-06",
      }),
    ).toBe(true);

    expect(await db.$count(transaction)).toBe(1);
    expect(await stored(tx.id)).toMatchObject({ date: "2026-06-10", recurrenceEnd: "2026-12-01" });
    expect(await listIn("2026-04")).toEqual([]);
    expect(await listIn("2026-05")).toEqual([]);
    expect((await listIn("2026-06")).map((t) => t.date)).toEqual(["2026-06-10"]);
  });

  it("ignores the start month sent when editing a month in the middle of the series", async () => {
    const tx = until("2026-04-10", "2026-04", "2026-12");
    await transactionsRepo.create(userId, tx);

    await transactionsRepo.updateFrom(userId, tx.id, "2026-08", {
      ...tx,
      date: "2026-08-10",
      amountCents: 5000,
      recurrenceStartMonth: "2026-02",
    });

    const rows = await db.select().from(transaction);
    expect(rows.map((r) => [r.date, r.recurrenceEnd, r.amountCents]).sort()).toEqual([
      ["2026-04-10", "2026-07-01", 4000],
      ["2026-08-10", "2026-12-01", 5000],
    ]);
  });

  it("starts at the chosen month when a single row becomes an 'until' series", async () => {
    const single = expense("2026-04-10", 4000);
    await transactionsRepo.create(userId, single);

    await transactionsRepo.updateFrom(userId, single.id, "2026-04", {
      ...single,
      recurrence: "until",
      recurrenceStartMonth: "2026-05",
      recurrenceEndMonth: "2026-07",
    });

    expect(await stored(single.id)).toMatchObject({
      date: "2026-05-10",
      recurring: true,
      recurrenceEnd: "2026-07-01",
    });
  });
});

describe("transactionsRepo installment of listed occurrences", () => {
  const month = (key: string) =>
    monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  const listIn = (key: string, user = userId) => transactionsRepo.listByMonth(user, month(key));
  const until = (date: string, end: string, amountCents = 4000) => ({
    ...expense(date, amountCents),
    recurrence: "until" as const,
    recurrenceStartMonth: date.slice(0, 7),
    recurrenceEndMonth: end,
  });

  it("numbers a 05/2026-12/2026 series 1/8 in May, 3/8 in July and 8/8 in December", async () => {
    await transactionsRepo.create(userId, until("2026-05-10", "2026-12"));

    expect((await listIn("2026-05"))[0].installment).toEqual({ number: 1, total: 8 });
    expect((await listIn("2026-07"))[0].installment).toEqual({ number: 3, total: 8 });
    expect((await listIn("2026-12"))[0].installment).toEqual({ number: 8, total: 8 });
    expect((await listIn("2026-07"))[0].seriesStart).toBe("2026-05");
  });

  it("has no installment for a 'forever' series or a single row; only the single has no series start", async () => {
    const forever = { ...expense("2026-10-10", 1000), recurrence: "forever" as const };
    const single = expense("2026-10-11", 2000);
    await transactionsRepo.create(userId, forever);
    await transactionsRepo.create(userId, single);

    const listed = await listIn("2026-10");
    expect(listed.map((t) => [t.id, t.installment, t.seriesStart])).toEqual([
      [single.id, null, null],
      [forever.id, null, "2026-10"],
    ]);
  });

  it("counts N from the series start and T to the final end after a mid-series edit", async () => {
    const tx = until("2026-05-10", "2027-04");
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.updateFrom(userId, tx.id, "2026-12", {
      ...tx,
      date: "2026-12-10",
      amountCents: 5000,
    });

    const [july] = await listIn("2026-07");
    const [dec] = await listIn("2026-12");
    expect([july.amountCents, july.installment]).toEqual([4000, { number: 3, total: 12 }]);
    expect([dec.amountCents, dec.installment]).toEqual([5000, { number: 8, total: 12 }]);
    expect(dec.seriesStart).toBe("2026-05");
  });

  it("recomputes the total up to the previous month after deleting from month M", async () => {
    const tx = until("2026-05-10", "2026-12");
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.deleteFrom(userId, tx.id, "2026-09");

    expect((await listIn("2026-08"))[0].installment).toEqual({ number: 4, total: 4 });
    expect((await listIn("2026-05"))[0].installment).toEqual({ number: 1, total: 4 });
  });

  it("has no installment anywhere when the last segment of the series has no end", async () => {
    const tx = until("2026-05-10", "2027-04");
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.updateFrom(userId, tx.id, "2026-09", {
      ...tx,
      date: "2026-09-10",
      recurrence: "forever",
      recurrenceEndMonth: null,
    });

    expect((await listIn("2026-07"))[0].installment).toBeNull();
    expect((await listIn("2026-10"))[0].installment).toBeNull();
  });

  it("does not mix in the series of another user", async () => {
    await transactionsRepo.create(userId, until("2026-05-10", "2026-12"));
    const other = await insertTestUser();
    await categoriesRepo.replaceSet(other, [{ name: "Conforto", percentMicro: 100000000, color: 1 }]);
    const otherCategory = (await categoriesRepo.list(other))[0].id;
    await transactionsRepo.create(other, {
      ...until("2026-01-10", "2026-12"),
      categoryId: otherCategory,
    });

    expect((await listIn("2026-07"))[0].installment).toEqual({ number: 3, total: 8 });
    expect((await listIn("2026-07", other))[0].installment).toEqual({ number: 7, total: 12 });
  });
});

describe("transactionsRepo.findStored series start", () => {
  it("returns the first month of the series, the same for every segment, and null for a single row", async () => {
    const tx = {
      ...expense("2026-05-10"),
      recurrence: "until" as const,
      recurrenceStartMonth: "2026-05",
      recurrenceEndMonth: "2027-04",
    };
    await transactionsRepo.create(userId, tx);
    await transactionsRepo.updateFrom(userId, tx.id, "2026-09", { ...tx, date: "2026-09-10" });
    const rows = await db.select().from(transaction);
    const later = rows.find((r) => r.id !== tx.id)!;
    const single = expense("2026-10-01");
    await transactionsRepo.create(userId, single);

    expect(await transactionsRepo.findStored(userId, tx.id)).toMatchObject({ seriesStart: "2026-05" });
    expect(await transactionsRepo.findStored(userId, later.id)).toMatchObject({
      seriesStart: "2026-05",
    });
    expect(await transactionsRepo.findStored(userId, single.id)).toMatchObject({
      recurring: false,
      seriesStart: null,
    });
  });
});
