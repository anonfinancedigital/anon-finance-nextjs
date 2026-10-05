import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { subcategory, transaction } from "../schema";
import { categoriesRepo } from "./categories";

setupTestDb();

const BUDGET = [
  { name: "Moradia", percentMicro: 30000000, color: 1 },
  { name: "Conforto", percentMicro: 30000000, color: 2 },
  { name: "Metas", percentMicro: 10000000, color: 3 },
  { name: "Prazeres", percentMicro: 10000000, color: 4 },
  { name: "Liberdade", percentMicro: 20000000, color: 5 },
];

const strip = (cats: { name: string; percentMicro: number; color: number }[]) =>
  cats.map(({ name, percentMicro, color }) => ({ name, percentMicro, color }));

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
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentMicro: 100000000, color: 7 }]);
    expect(strip(await categoriesRepo.list(otherId))).toEqual([
      { name: "Tudo", percentMicro: 100000000, color: 7 },
    ]);
    expect(strip(await categoriesRepo.list(userId))).toEqual(BUDGET);
  });

  it("updates existing categories in place when ids are sent (upsert)", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const saved = await categoriesRepo.list(userId);
    const edited = saved.map((c, i) =>
      i === 0 ? { ...c, name: "Casa", percentMicro: 25000000 } : i === 4 ? { ...c, percentMicro: 25000000 } : c,
    );

    expect(await categoriesRepo.replaceSet(userId, edited)).toEqual({ ok: true });
    expect(await categoriesRepo.list(userId)).toEqual(edited);
  });

  it("rejects a set that does not sum to 100% and persists nothing", async () => {
    const userId = await insertTestUser();
    const result = await categoriesRepo.replaceSet(userId, [
      ...BUDGET,
      { name: "Extra", percentMicro: 5000000, color: 6 },
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
      .map((c) => (c.name === "Liberdade" ? { ...c, percentMicro: 30000000 } : c));
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
      .map((c) => (c.name === "Liberdade" ? { ...c, percentMicro: 30000000 } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect(await categoriesRepo.list(userId)).toEqual(next);
  });
});

describe("categoriesRepo color", () => {
  it("creates categories with the given colors and lists them back", async () => {
    const userId = await insertTestUser();
    const withColors = BUDGET.map((c, i) => ({ ...c, color: [7, 7, 1, 8, 2][i] }));
    await categoriesRepo.replaceSet(userId, withColors);
    expect((await categoriesRepo.list(userId)).map((c) => c.color)).toEqual([7, 7, 1, 8, 2]);
  });

  it("updates the color of an existing category", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const saved = await categoriesRepo.list(userId);
    const edited = saved.map((c) => (c.name === "Metas" ? { ...c, color: 7 } : c));

    expect(await categoriesRepo.replaceSet(userId, edited)).toEqual({ ok: true });
    const listed = await categoriesRepo.list(userId);
    expect(listed.find((c) => c.name === "Metas")).toMatchObject({ id: saved[2].id, color: 7 });
    expect(listed.map((c) => c.color)).toEqual([1, 2, 7, 4, 5]);
  });

  it("does not leak another user's colors", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    await categoriesRepo.replaceSet(otherId, [{ name: "Moradia", percentMicro: 100000000, color: 8 }]);
    expect((await categoriesRepo.list(userId)).map((c) => c.color)).toEqual([1, 2, 3, 4, 5]);
    expect((await categoriesRepo.list(otherId)).map((c) => c.color)).toEqual([8]);
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

describe("categoriesRepo.list subcategories", () => {
  async function seedSubcategories(userId: string, categoryId: string, names: string[]) {
    for (const name of names) {
      await db.insert(subcategory).values({ userId, categoryId, name });
    }
  }

  it("lists each category's subcategories in creation order", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const [moradia, conforto] = await categoriesRepo.list(userId);
    await seedSubcategories(userId, conforto.id, ["Streaming", "Restaurante", "Cinema"]);
    await seedSubcategories(userId, moradia.id, ["Aluguel"]);

    const listed = await categoriesRepo.list(userId);
    expect(listed[0].subcategories.map((s) => s.name)).toEqual(["Aluguel"]);
    expect(listed[1].subcategories.map((s) => s.name)).toEqual([
      "Streaming",
      "Restaurante",
      "Cinema",
    ]);
  });

  it("returns an empty array for a category without subcategories", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    const listed = await categoriesRepo.list(userId);
    expect(listed.map((c) => c.subcategories)).toEqual([[], [], [], [], []]);
  });

  it("does not leak the subcategories of another user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, BUDGET);
    await categoriesRepo.replaceSet(otherId, [{ name: "Tudo", percentMicro: 100000000, color: 7 }]);
    const [other] = await categoriesRepo.list(otherId);
    await seedSubcategories(otherId, other.id, ["Segredo"]);

    const mine = await categoriesRepo.list(userId);
    expect(mine.flatMap((c) => c.subcategories)).toEqual([]);
    expect((await categoriesRepo.list(otherId))[0].subcategories.map((s) => s.name)).toEqual([
      "Segredo",
    ]);
  });
});

describe("categoriesRepo.replaceSet subcategories", () => {
  const names = (c: { subcategories: { name: string }[] }) => c.subcategories.map((s) => s.name);

  /** BUDGET with the given subcategory names on "Conforto" (index 1). */
  const withConforto = (...subs: { id?: string; name: string }[]) =>
    BUDGET.map((c) => ({ ...c, subcategories: c.name === "Conforto" ? subs : [] }));

  async function seed(userId: string, ...subs: string[]) {
    await categoriesRepo.replaceSet(userId, withConforto(...subs.map((name) => ({ name }))));
    return categoriesRepo.list(userId);
  }

  async function addSubExpenses(userId: string, categoryId: string, subId: string, n: number) {
    for (let i = 0; i < n; i++) {
      await db.insert(transaction).values({
        id: randomUUID(),
        userId,
        kind: "expense",
        amountCents: 1000,
        date: "2026-10-04",
        categoryId,
        subcategoryId: subId,
      });
    }
  }

  it("creates a new category with subcategories in the same save", async () => {
    const userId = await insertTestUser();
    const result = await categoriesRepo.replaceSet(userId, [
      { name: "Conforto", percentMicro: 100000000, color: 1, subcategories: [{ name: "Restaurante" }, { name: "Streaming" }] },
    ]);
    expect(result).toEqual({ ok: true });
    const [conforto] = await categoriesRepo.list(userId);
    expect(names(conforto)).toEqual(["Restaurante", "Streaming"]);
  });

  it("renames a subcategory keeping its id and its expenses", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante");
    const conforto = saved[1];
    const sub = conforto.subcategories[0];
    await addSubExpenses(userId, conforto.id, sub.id, 2);

    const next = saved.map((c) => (c.id === conforto.id ? { ...c, subcategories: [{ id: sub.id, name: "Almoço" }] } : c));
    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });

    const [after] = (await categoriesRepo.list(userId))[1].subcategories;
    expect(after).toEqual({ id: sub.id, name: "Almoço" });
    expect(await db.$count(transaction, eq(transaction.subcategoryId, sub.id))).toBe(2);
  });

  it("removes a subcategory without expenses", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante", "Streaming");
    const [keep] = saved[1].subcategories;
    const next = saved.map((c) => (c.name === "Conforto" ? { ...c, subcategories: [keep] } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect(names((await categoriesRepo.list(userId))[1])).toEqual(["Restaurante"]);
  });

  it("blocks removing a subcategory with expenses and changes nothing in the set", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante", "Streaming");
    const [restaurante] = saved[1].subcategories;
    await addSubExpenses(userId, saved[1].id, restaurante.id, 3);

    // Also rename another category and drop the other subcategory: none of it may persist.
    const next = saved.map((c) =>
      c.name === "Conforto"
        ? { ...c, subcategories: [saved[1].subcategories[1]] }
        : c.name === "Moradia"
          ? { ...c, name: "Casa" }
          : c,
    );
    const result = await categoriesRepo.replaceSet(userId, next);

    const message = "Esta subcategoria tem 3 gastos e não pode ser excluída";
    expect(result).toEqual({ ok: false, error: message, fieldErrors: { "1.subcategories": message } });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
  });

  it("removes the subcategories along with a category that has no expenses", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante", "Streaming");
    const next = saved
      .filter((c) => c.name !== "Conforto")
      .map((c) => (c.name === "Liberdade" ? { ...c, percentMicro: 50000000 } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect(await db.$count(subcategory)).toBe(0);
  });

  it("keeps the category message when removing a category whose subcategory has expenses", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante");
    await addSubExpenses(userId, saved[1].id, saved[1].subcategories[0].id, 2);
    const next = saved
      .filter((c) => c.name !== "Conforto")
      .map((c) => (c.name === "Liberdade" ? { ...c, percentMicro: 50000000 } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({
      ok: false,
      error: "Esta categoria tem 2 gastos e não pode ser excluída",
    });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
  });

  it("rejects a subcategory id from another category", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante");
    const foreign = saved[1].subcategories[0];
    const next = saved.map((c) => (c.name === "Moradia" ? { ...c, subcategories: [foreign] } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({
      ok: false,
      error: "Subcategoria não encontrada",
    });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
  });

  it("rejects a subcategory id from another user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await seed(userId);
    const otherSaved = await seed(otherId, "Segredo");
    const foreign = otherSaved[1].subcategories[0];
    const mine = await categoriesRepo.list(userId);
    const next = mine.map((c) => (c.name === "Conforto" ? { ...c, subcategories: [foreign] } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({
      ok: false,
      error: "Subcategoria não encontrada",
    });
    expect(names((await categoriesRepo.list(otherId))[1])).toEqual(["Segredo"]);
  });

  it("accepts removing 'Restaurante' and creating 'restaurante' in the same save", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante");
    const next = saved.map((c) =>
      c.name === "Conforto" ? { ...c, subcategories: [{ name: "restaurante" }] } : c,
    );

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    const [created] = (await categoriesRepo.list(userId))[1].subcategories;
    expect(created.name).toBe("restaurante");
    expect(created.id).not.toBe(saved[1].subcategories[0].id);
  });

  it("accepts a rename that only changes the case", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "restaurante");
    const sub = saved[1].subcategories[0];
    const next = saved.map((c) => (c.name === "Conforto" ? { ...c, subcategories: [{ id: sub.id, name: "Restaurante" }] } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect((await categoriesRepo.list(userId))[1].subcategories).toEqual([{ id: sub.id, name: "Restaurante" }]);
  });

  it("accepts swapping the names of two subcategories in one save", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante", "Streaming");
    const [a, b] = saved[1].subcategories;
    const next = saved.map((c) =>
      c.name === "Conforto"
        ? {
            ...c,
            subcategories: [
              { id: a.id, name: b.name },
              { id: b.id, name: a.name },
            ],
          }
        : c,
    );

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect((await categoriesRepo.list(userId))[1].subcategories).toEqual([
      { id: a.id, name: "Streaming" },
      { id: b.id, name: "Restaurante" },
    ]);
  });
});
