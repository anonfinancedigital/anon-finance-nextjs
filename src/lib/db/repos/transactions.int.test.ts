import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { monthRange } from "@/lib/domain/month";
import type { CategorySetDto, TransactionDto, UpdateTransactionDto } from "@/lib/vault/types";
import { insertCategory, insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { transaction } from "../schema";
import { categoriesRepo } from "./categories";
import { transactionsRepo } from "./transactions";

setupTestDb();

const OCTOBER = monthRange({ year: 2026, month: 10 });

let userId: string;
let conforto: string;

beforeEach(async () => {
  userId = await insertTestUser();
  conforto = (await insertCategory(userId, { name: "Conforto", percentMicro: 60000000, color: 1 })).id;
});

/** Stand-in for a sealed amount: the tests read it back as `v1:a<cents>`. */
const amountCt = (cents: number) => `v1:a${cents}`;
const centsOf = (ct: string) => Number(ct.slice(4));

const expense = (date: string, cents = 1000, categoryId = conforto): TransactionDto => ({
  id: randomUUID(),
  kind: "expense",
  date,
  categoryId,
  subcategoryId: null,
  amountCt: amountCt(cents),
  descriptionCt: null,
  recurrence: "none",
});

/** Sealed edit of `tx` with the given overrides; the new segment gets the same amount. */
const edit = (tx: TransactionDto, overrides: Partial<UpdateTransactionDto> = {}): UpdateTransactionDto => ({
  ...tx,
  newRowId: randomUUID(),
  insertedCt: { amountCt: overrides.amountCt ?? tx.amountCt, descriptionCt: null },
  ...overrides,
});

const month = (key: string) =>
  monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
const listIn = (key: string, user = userId) => transactionsRepo.listByMonthSealed(user, month(key));
const amountsIn = async (...keys: string[]) =>
  Promise.all(keys.map(async (k) => (await listIn(k)).map((t) => centsOf(t.amountCt))));
const snapshot = async () =>
  (await db.select().from(transaction)).sort((a, b) => a.id.localeCompare(b.id));

describe("transactionsRepo.deleteFrom", () => {
  const rent = (): TransactionDto => ({ ...expense("2026-10-15", 10000), recurrence: "indefinite" });

  it("deletes a recurring income of Oct from Dec on: Oct and Nov keep it, Dec onward not", async () => {
    const salary: TransactionDto = {
      id: randomUUID(),
      kind: "income",
      date: "2026-10-05",
      categoryId: null,
      subcategoryId: null,
      amountCt: amountCt(500000),
      descriptionCt: null,
      recurrence: "indefinite",
    };
    await transactionsRepo.createSealed(userId, salary);

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
    await transactionsRepo.createSealed(userId, tx);

    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2026-10")).toBe(true);

    expect(await db.$count(transaction)).toBe(0);
    expect(await amountsIn("2026-10", "2026-11", "2027-06")).toEqual([[], [], []]);
  });

  it("after series edits, deletes the edited segment and later ones, keeping the earlier one", async () => {
    const tx = rent();
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.updateFromSealed(
      userId,
      tx.id,
      "2026-12",
      edit(tx, { date: "2026-12-15", amountCt: amountCt(12000) }),
    );
    const [dec] = await listIn("2026-12");
    await transactionsRepo.updateFromSealed(
      userId,
      dec.id,
      "2027-02",
      edit(tx, { date: "2027-02-15", amountCt: amountCt(15000) }),
    );

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
    await transactionsRepo.createSealed(userId, tx);
    const before = await snapshot();

    expect(await transactionsRepo.deleteFrom(await insertTestUser(), tx.id, "2026-12")).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("returns false for a month outside the segment and changes no row", async () => {
    const tx: TransactionDto = {
      ...rent(),
      recurrence: "until",
      recurrenceStartMonth: "2026-10",
      recurrenceEndMonth: "2026-12",
    };
    await transactionsRepo.createSealed(userId, tx);
    const before = await snapshot();

    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2026-09")).toBe(false);
    expect(await transactionsRepo.deleteFrom(userId, tx.id, "2027-01")).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("still blocks deleting a category that has a recurring expense", async () => {
    const owner = await insertTestUser();
    const now = new Date("2026-10-15T15:00:00Z");
    const keep = { clientId: randomUUID(), color: 1, isInvestment: false, nameCt: "v1:a", subcategories: [] };
    const drop = { ...keep, clientId: randomUUID(), nameCt: "v1:b" };
    const withPercent = (item: typeof keep) => ({
      ...item,
      percentChange: { fromMonth: "2026-10-01", percentCt: "v1:p" },
    });
    const set = (items: (typeof keep)[]): CategorySetDto => ({ items });
    expect(await categoriesRepo.replaceSetSealed(owner, set([withPercent(keep), withPercent(drop)]), now)).toEqual({
      ok: true,
    });
    await transactionsRepo.createSealed(owner, {
      ...expense("2026-10-15", 10000, drop.clientId),
      recurrence: "indefinite",
    });
    const before = await categoriesRepo.listForMonthSealed(owner, { year: 2026, month: 10 }, now);

    const kept = { ...keep, id: keep.clientId };
    expect(await categoriesRepo.replaceSetSealed(owner, set([kept]), now)).toEqual({
      ok: false,
      error: "Esta categoria tem 1 gasto e não pode ser excluída",
    });
    expect(await categoriesRepo.listForMonthSealed(owner, { year: 2026, month: 10 }, now)).toEqual(before);
  });
});

describe("transactionsRepo.delete", () => {
  it("removes the transaction", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.createSealed(userId, tx);

    expect(await transactionsRepo.delete(userId, tx.id)).toBe(true);
    expect(await transactionsRepo.listByMonthSealed(userId, OCTOBER)).toEqual([]);
  });

  it("does not remove a transaction of another user", async () => {
    const tx = expense("2026-10-04");
    await transactionsRepo.createSealed(userId, tx);

    expect(await transactionsRepo.delete(await insertTestUser(), tx.id)).toBe(false);
    expect((await transactionsRepo.listByMonthSealed(userId, OCTOBER)).map((t) => t.id)).toEqual([tx.id]);
  });
});

describe("transactionsRepo installment of listed occurrences", () => {
  const until = (date: string, end: string, cents = 4000): TransactionDto => ({
    ...expense(date, cents),
    recurrence: "until",
    recurrenceStartMonth: date.slice(0, 7),
    recurrenceEndMonth: end,
  });

  it("numbers a 05/2026-12/2026 series 1/8 in May, 3/8 in July and 8/8 in December", async () => {
    await transactionsRepo.createSealed(userId, until("2026-05-10", "2026-12"));

    expect((await listIn("2026-05"))[0].installment).toEqual({ number: 1, total: 8 });
    expect((await listIn("2026-07"))[0].installment).toEqual({ number: 3, total: 8 });
    expect((await listIn("2026-12"))[0].installment).toEqual({ number: 8, total: 8 });
    expect((await listIn("2026-07"))[0].seriesStart).toBe("2026-05");
  });

  it("has no installment for an 'indefinite' series or a single row; only the single has no series start", async () => {
    const forever: TransactionDto = { ...expense("2026-10-10", 1000), recurrence: "indefinite" };
    const single = expense("2026-10-11", 2000);
    await transactionsRepo.createSealed(userId, forever);
    await transactionsRepo.createSealed(userId, single);

    const listed = await listIn("2026-10");
    expect(listed.map((t) => [t.id, t.installment, t.seriesStart])).toEqual([
      [single.id, null, null],
      [forever.id, null, "2026-10"],
    ]);
  });

  it("counts N from the series start and T to the final end after a mid-series edit", async () => {
    const tx = until("2026-05-10", "2027-04");
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.updateFromSealed(
      userId,
      tx.id,
      "2026-12",
      edit(tx, { date: "2026-12-10", amountCt: amountCt(5000) }),
    );

    const [july] = await listIn("2026-07");
    const [dec] = await listIn("2026-12");
    expect([centsOf(july.amountCt), july.installment]).toEqual([4000, { number: 3, total: 12 }]);
    expect([centsOf(dec.amountCt), dec.installment]).toEqual([5000, { number: 8, total: 12 }]);
    expect(dec.seriesStart).toBe("2026-05");
  });

  it("recomputes the total up to the previous month after deleting from month M", async () => {
    const tx = until("2026-05-10", "2026-12");
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.deleteFrom(userId, tx.id, "2026-09");

    expect((await listIn("2026-08"))[0].installment).toEqual({ number: 4, total: 4 });
    expect((await listIn("2026-05"))[0].installment).toEqual({ number: 1, total: 4 });
  });

  it("has no installment anywhere when the last segment of the series has no end", async () => {
    const tx = until("2026-05-10", "2027-04");
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.updateFromSealed(
      userId,
      tx.id,
      "2026-09",
      edit(tx, { date: "2026-09-10", recurrence: "indefinite", recurrenceEndMonth: undefined }),
    );

    expect((await listIn("2026-07"))[0].installment).toBeNull();
    expect((await listIn("2026-10"))[0].installment).toBeNull();
  });

  it("does not mix in the series of another user", async () => {
    await transactionsRepo.createSealed(userId, until("2026-05-10", "2026-12"));
    const other = await insertTestUser();
    const otherCategory = (await insertCategory(other, { name: "Conforto", percentMicro: 100000000, color: 1 })).id;
    await transactionsRepo.createSealed(other, {
      ...until("2026-01-10", "2026-12"),
      categoryId: otherCategory,
    });

    expect((await listIn("2026-07"))[0].installment).toEqual({ number: 3, total: 8 });
    expect((await listIn("2026-07", other))[0].installment).toEqual({ number: 7, total: 12 });
  });
});

describe("transactionsRepo series of another user with the same series id", () => {
  it("ignores the other user's segments when computing installment and series start", async () => {
    const tx: TransactionDto = {
      ...expense("2026-05-10", 4000),
      recurrence: "until",
      recurrenceStartMonth: "2026-05",
      recurrenceEndMonth: "2026-12",
    };
    await transactionsRepo.createSealed(userId, tx);
    const other = await insertTestUser();
    // The schema does not make series_id unique per user, so a foreign row can share it.
    await db.insert(transaction).values({
      id: randomUUID(),
      userId: other,
      kind: "income",
      amountCt: "v1:outro",
      date: "2026-01-10",
      recurring: true,
      recurrenceDay: 10,
      recurrenceEnd: "2027-12-01",
      seriesId: tx.id,
    });

    const [july] = await listIn("2026-07");
    expect(july.installment).toEqual({ number: 3, total: 8 });
    expect(july.seriesStart).toBe("2026-05");
    expect(await transactionsRepo.findStored(userId, tx.id)).toMatchObject({
      seriesStart: "2026-05",
    });
  });
});

describe("transactionsRepo.findStored series start", () => {
  it("returns the first month of the series, the same for every segment, and null for a single row", async () => {
    const tx: TransactionDto = {
      ...expense("2026-05-10"),
      recurrence: "until",
      recurrenceStartMonth: "2026-05",
      recurrenceEndMonth: "2027-04",
    };
    await transactionsRepo.createSealed(userId, tx);
    await transactionsRepo.updateFromSealed(userId, tx.id, "2026-09", edit(tx, { date: "2026-09-10" }));
    const rows = await db.select().from(transaction);
    const later = rows.find((r) => r.id !== tx.id)!;
    const single = expense("2026-10-01");
    await transactionsRepo.createSealed(userId, single);

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

describe("transactionsRepo.countAll", () => {
  it("is 0 for a user without transactions", async () => {
    expect(await transactionsRepo.countAll(userId)).toBe(0);
  });

  it("counts stored transactions across different months", async () => {
    for (const date of ["2026-09-10", "2026-10-05", "2026-10-20"]) {
      await transactionsRepo.createSealed(userId, expense(date));
    }
    expect(await transactionsRepo.countAll(userId)).toBe(3);
  });

  it("ignores other users' transactions", async () => {
    await transactionsRepo.createSealed(userId, expense("2026-10-05"));
    const otherId = await insertTestUser();
    const otherCategory = (await insertCategory(otherId, { name: "Outra", percentMicro: 100000000, color: 1 })).id;
    await transactionsRepo.createSealed(otherId, expense("2026-10-06", 1000, otherCategory));
    await transactionsRepo.createSealed(otherId, expense("2026-11-06", 1000, otherCategory));

    expect(await transactionsRepo.countAll(userId)).toBe(1);
    expect(await transactionsRepo.countAll(otherId)).toBe(2);
  });
});
