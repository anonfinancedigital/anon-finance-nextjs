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
    { name: "Conforto", percentBp: 6000 },
    { name: "Lazer", percentBp: 4000 },
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
