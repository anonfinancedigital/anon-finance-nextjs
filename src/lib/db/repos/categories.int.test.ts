import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { transaction } from "../schema";
import { categoriesRepo } from "./categories";

setupTestDb();

const BUDGET = [
  { name: "Moradia", percentBp: 3000 },
  { name: "Conforto", percentBp: 3000 },
  { name: "Metas", percentBp: 1000 },
  { name: "Prazeres", percentBp: 1000 },
  { name: "Liberdade", percentBp: 2000 },
];

const strip = (cats: { name: string; percentBp: number }[]) =>
  cats.map(({ name, percentBp }) => ({ name, percentBp }));

async function addExpenses(userId: string, categoryId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await db.insert(transaction).values({
      id: randomUUID(),
      userId,
      kind: "expense",
      amountCents: 1000,
      date: "2026-10-04",
      categoryId,
    });
  }
}

describe("categoriesRepo.replaceSet + list", () => {
  it("persists a valid set and lists it in creation order", async () => {
    const userId = await insertTestUser();
    expect(await categoriesRepo.replaceSet(userId, BUDGET)).toEqual({ ok: true });
    expect(strip(await categoriesRepo.list(userId))).toEqual(BUDGET);
  });

  it("lists only the categories of the given user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentBp: 10000 }]);
    expect(strip(await categoriesRepo.list(otherId))).toEqual([{ name: "Tudo", percentBp: 10000 }]);
    expect(strip(await categoriesRepo.list(userId))).toEqual(BUDGET);
  });

  it("updates existing categories in place when ids are sent (upsert)", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const saved = await categoriesRepo.list(userId);
    const edited = saved.map((c, i) =>
      i === 0 ? { ...c, name: "Casa", percentBp: 2500 } : i === 4 ? { ...c, percentBp: 2500 } : c,
    );

    expect(await categoriesRepo.replaceSet(userId, edited)).toEqual({ ok: true });
    expect(await categoriesRepo.list(userId)).toEqual(edited);
  });

  it("rejects a set that does not sum to 100% and persists nothing", async () => {
    const userId = await insertTestUser();
    const result = await categoriesRepo.replaceSet(userId, [
      ...BUDGET,
      { name: "Extra", percentBp: 500 },
    ]);
    expect(result).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 105%)",
    });
    expect(await categoriesRepo.list(userId)).toEqual([]);
  });

  it("blocks removing a category with 3 expenses and keeps the previous set intact", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const before = await categoriesRepo.list(userId);
    const metas = before.find((c) => c.name === "Metas")!;
    await addExpenses(userId, metas.id, 3);

    // Remove "Metas" and give its 10% to "Liberdade": a valid set, blocked only by the expenses.
    const next = before
      .filter((c) => c.id !== metas.id)
      .map((c) => (c.name === "Liberdade" ? { ...c, percentBp: 3000 } : c));
    const result = await categoriesRepo.replaceSet(userId, next);

    expect(result).toEqual({
      ok: false,
      error: "Esta categoria tem 3 gastos e não pode ser excluída",
    });
    expect(await categoriesRepo.list(userId)).toEqual(before);
  });

  it("removes a category without expenses when the rest is rebalanced to 100%", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const before = await categoriesRepo.list(userId);
    const next = before
      .filter((c) => c.name !== "Metas")
      .map((c) => (c.name === "Liberdade" ? { ...c, percentBp: 3000 } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect(await categoriesRepo.list(userId)).toEqual(next);
  });
});

describe("categoriesRepo.countExpenses", () => {
  it("counts the expenses linked to a category", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const [moradia, conforto] = await categoriesRepo.list(userId);
    await addExpenses(userId, moradia.id, 3);

    expect(await categoriesRepo.countExpenses(moradia.id)).toBe(3);
    expect(await categoriesRepo.countExpenses(conforto.id)).toBe(0);
  });
});
