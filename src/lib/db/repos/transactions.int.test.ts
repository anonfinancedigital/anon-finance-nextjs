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
