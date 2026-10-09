import { randomUUID } from "node:crypto";
import { eq, isNotNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertCategory, insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { category, categoryPercent, subcategory, transaction } from "../schema";
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

describe("categoriesRepo investment flag", () => {
  const investment = (isInvestment?: boolean) => [
    { name: "Moradia", percentMicro: 80000000, color: 1 },
    { name: "Liberdade", percentMicro: 20000000, color: 5, isInvestment },
  ];
  const flags = async (userId: string) =>
    (await categoriesRepo.list(userId)).map((c) => [c.name, c.isInvestment]);

  it("persists true and lists it back, leaving the other category false", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, investment(true));
    expect(await flags(userId)).toEqual([["Moradia", false], ["Liberdade", true]]);
  });

  it("an item without the field is stored as false", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, investment());
    expect(await flags(userId)).toEqual([["Moradia", false], ["Liberdade", false]]);
  });

  it("resending an existing category with false clears the flag", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, investment(true));
    const saved = await categoriesRepo.list(userId);
    await categoriesRepo.replaceSet(
      userId,
      saved.map((c) => ({ id: c.id, name: c.name, percentMicro: c.percentMicro, color: c.color, isInvestment: false })),
    );
    expect(await flags(userId)).toEqual([["Moradia", false], ["Liberdade", false]]);
  });

  it("resending an existing category with true sets the flag", async () => {
    const userId = await insertTestUser();
    await categoriesRepo.replaceSet(userId, investment(false));
    const saved = await categoriesRepo.list(userId);
    await categoriesRepo.replaceSet(
      userId,
      saved.map((c) => ({ id: c.id, name: c.name, percentMicro: c.percentMicro, color: c.color, isInvestment: c.name === "Liberdade" })),
    );
    expect(await flags(userId)).toEqual([["Moradia", false], ["Liberdade", true]]);
  });
});

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

  it("keeps the subcategories of a soft-deleted category that has no expenses", async () => {
    const userId = await insertTestUser();
    const saved = await seed(userId, "Restaurante", "Streaming");
    const next = saved
      .filter((c) => c.name !== "Conforto")
      .map((c) => (c.name === "Liberdade" ? { ...c, percentMicro: 50000000 } : c));

    expect(await categoriesRepo.replaceSet(userId, next)).toEqual({ ok: true });
    expect(await db.$count(subcategory)).toBe(2);
    expect((await categoriesRepo.list(userId)).some((c) => c.name === "Conforto")).toBe(false);
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

describe("categoriesRepo.listForMonth", () => {
  const NOW = new Date("2026-10-15T15:00:00Z"); // October 2026 in America/Sao_Paulo
  const OCT = { year: 2026, month: 10 };
  const percents = (cats: { name: string; percentMicro: number; hasPercent?: boolean }[]) =>
    cats.map(({ name, percentMicro, hasPercent }) => [name, percentMicro, hasPercent]);

  async function addVersion(categoryId: string, fromMonth: string, percentMicro: number) {
    await db.insert(categoryPercent).values({ categoryId, fromMonth, percentMicro });
  }

  it("uses the old version in a past month and the new one in the current month", async () => {
    const userId = await insertTestUser();
    const a = await insertCategory(userId, { name: "A", percentMicro: 50000000, color: 1 });
    const b = await insertCategory(userId, { name: "B", percentMicro: 50000000, color: 2 });
    await addVersion(a.id, "2026-10-01", 40000000);
    await addVersion(b.id, "2026-10-01", 60000000);

    expect(percents(await categoriesRepo.listForMonth(userId, { year: 2026, month: 9 }, NOW))).toEqual([
      ["A", 50000000, true],
      ["B", 50000000, true],
    ]);
    expect(percents(await categoriesRepo.listForMonth(userId, OCT, NOW))).toEqual([
      ["A", 40000000, true],
      ["B", 60000000, true],
    ]);
  });

  it("uses the last version for a future month", async () => {
    const userId = await insertTestUser();
    const a = await insertCategory(userId, { name: "A", percentMicro: 50000000, color: 1 });
    await addVersion(a.id, "2026-10-01", 40000000);
    const [future] = await categoriesRepo.listForMonth(userId, { year: 2027, month: 3 }, NOW);
    expect(future).toMatchObject({ percentMicro: 40000000, hasPercent: true });
  });

  it("marks a category with a version only from the current month as hasPercent false before it", async () => {
    const userId = await insertTestUser();
    await insertCategory(userId, { name: "Nova", percentMicro: 100000000, color: 1, fromMonth: "2026-10-01" });
    const [before] = await categoriesRepo.listForMonth(userId, { year: 2026, month: 9 }, NOW);
    expect(before).toMatchObject({ name: "Nova", percentMicro: 0, hasPercent: false });
    const [current] = await categoriesRepo.listForMonth(userId, OCT, NOW);
    expect(current).toMatchObject({ percentMicro: 100000000, hasPercent: true });
  });

  it("shows a deleted category before deleted_from and hides it from that month on", async () => {
    const userId = await insertTestUser();
    await insertCategory(userId, { name: "Fica", percentMicro: 50000000, color: 1 });
    const gone = await insertCategory(userId, { name: "Sai", percentMicro: 50000000, color: 2 });
    await db.update(category).set({ deletedFrom: "2026-10-01" }).where(eq(category.id, gone.id));

    const names = async (month: { year: number; month: number }) =>
      (await categoriesRepo.listForMonth(userId, month, NOW)).map((c) => c.name);
    expect(await names({ year: 2026, month: 9 })).toEqual(["Fica", "Sai"]);
    expect(await names(OCT)).toEqual(["Fica"]);
    expect(await names({ year: 2026, month: 11 })).toEqual(["Fica"]);
  });

  it("flags a category deleted after the month shown as deleted, without leaking deletedFrom", async () => {
    const userId = await insertTestUser();
    await insertCategory(userId, { name: "Fica", percentMicro: 50000000, color: 1 });
    const gone = await insertCategory(userId, { name: "Sai", percentMicro: 50000000, color: 2 });
    await db.update(category).set({ deletedFrom: "2026-10-01" }).where(eq(category.id, gone.id));

    const sep = await categoriesRepo.listForMonth(userId, { year: 2026, month: 9 }, NOW);
    expect(sep.map((c) => [c.name, c.deleted])).toEqual([
      ["Fica", false],
      ["Sai", true],
    ]);
    expect(sep.every((c) => !("deletedFrom" in c))).toBe(true);
  });

  it("list is the month of now and omits deleted categories", async () => {
    const userId = await insertTestUser();
    const a = await insertCategory(userId, { name: "A", percentMicro: 50000000, color: 1 });
    const gone = await insertCategory(userId, { name: "Sai", percentMicro: 50000000, color: 2 });
    await addVersion(a.id, "2026-10-01", 70000000);
    await db.update(category).set({ deletedFrom: "2026-10-01" }).where(eq(category.id, gone.id));

    expect(percents(await categoriesRepo.list(userId, NOW))).toEqual([["A", 70000000, true]]);
    expect(percents(await categoriesRepo.list(userId, new Date("2026-09-30T23:30:00-03:00")))).toEqual([
      ["A", 50000000, true],
      ["Sai", 50000000, true],
    ]);
  });

  it("returns only the categories and subcategories of the requested user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    const mine = await insertCategory(userId, { name: "Minha", percentMicro: 100000000, color: 1 });
    await insertCategory(otherId, { name: "Dela", percentMicro: 100000000, color: 2 });
    await db.insert(subcategory).values({ userId, categoryId: mine.id, name: "Sub" });

    const result = await categoriesRepo.listForMonth(userId, OCT, NOW);
    expect(result.map((c) => c.name)).toEqual(["Minha"]);
    expect(result[0].subcategories.map((s) => s.name)).toEqual(["Sub"]);
  });
});

describe("categoriesRepo.replaceSet percent versions", () => {
  // 31 Oct 2026 23:30 and 1 Nov 2026 00:30 in America/Sao_Paulo (UTC-3).
  const OCT_NOW = new Date("2026-10-31T23:30:00-03:00");
  const NOV_NOW = new Date("2026-11-01T00:30:00-03:00");
  const SEP = { year: 2026, month: 9 };
  const OCT = { year: 2026, month: 10 };
  const NOV = { year: 2026, month: 11 };
  const TWO = [
    { name: "A", percentMicro: 50000000, color: 1 },
    { name: "B", percentMicro: 50000000, color: 2 },
  ];

  const versionsOf = async (userId: string) =>
    (
      await db
        .select({
          name: category.name,
          fromMonth: categoryPercent.fromMonth,
          percentMicro: categoryPercent.percentMicro,
        })
        .from(categoryPercent)
        .innerJoin(category, eq(category.id, categoryPercent.categoryId))
        .where(eq(category.userId, userId))
    ).sort((x, y) => x.name!.localeCompare(y.name!) || x.fromMonth.localeCompare(y.fromMonth));

  /** Seeds A/B at 50/50 "since ever" and returns them as editable items. */
  async function seed(userId: string) {
    const a = await insertCategory(userId, { ...TWO[0] });
    const b = await insertCategory(userId, { ...TWO[1] });
    return [
      { ...TWO[0], id: a.id },
      { ...TWO[1], id: b.id },
    ];
  }

  it("editing percents adds a version in the month of now and keeps the past months", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    const result = await categoriesRepo.replaceSet(
      userId,
      [
        { ...a, percentMicro: 40000000 },
        { ...b, percentMicro: 60000000 },
      ],
      OCT_NOW,
    );
    expect(result).toEqual({ ok: true });

    expect(await versionsOf(userId)).toEqual([
      { name: "A", fromMonth: "0001-01-01", percentMicro: 50000000 },
      { name: "A", fromMonth: "2026-10-01", percentMicro: 40000000 },
      { name: "B", fromMonth: "0001-01-01", percentMicro: 50000000 },
      { name: "B", fromMonth: "2026-10-01", percentMicro: 60000000 },
    ]);
    const past = await categoriesRepo.listForMonth(userId, SEP, OCT_NOW);
    expect(past.map((c) => c.percentMicro)).toEqual([50000000, 50000000]);
    const current = await categoriesRepo.listForMonth(userId, OCT, OCT_NOW);
    expect(current.map((c) => c.percentMicro)).toEqual([40000000, 60000000]);
  });

  it("only writes a version for the category whose percent changed", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    const three = [
      { ...a, percentMicro: 30000000 },
      { ...b, percentMicro: 50000000 },
      { name: "C", percentMicro: 20000000, color: 3 },
    ];
    await categoriesRepo.replaceSet(userId, three, OCT_NOW);
    const rows = await versionsOf(userId);
    expect(rows.filter((r) => r.name === "B")).toEqual([
      { name: "B", fromMonth: "0001-01-01", percentMicro: 50000000 },
    ]);
    expect(rows.filter((r) => r.name === "A")).toHaveLength(2);
  });

  it("renaming, recoloring and changing subcategories write no version", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    const before = await versionsOf(userId);
    const result = await categoriesRepo.replaceSet(
      userId,
      [
        { ...a, name: "Casa", color: 5, subcategories: [{ name: "Aluguel" }] },
        { ...b, color: 6 },
      ],
      OCT_NOW,
    );
    expect(result).toEqual({ ok: true });
    expect(await db.$count(subcategory)).toBe(1);
    expect((await versionsOf(userId)).map(({ fromMonth, percentMicro }) => [fromMonth, percentMicro])).toEqual(
      before.map(({ fromMonth, percentMicro }) => [fromMonth, percentMicro]),
    );
    expect(await db.$count(categoryPercent)).toBe(2);
  });

  it("saving twice in the same month keeps one row per category with the last value", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 40000000 }, { ...b, percentMicro: 60000000 }], OCT_NOW);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 70000000 }, { ...b, percentMicro: 30000000 }], OCT_NOW);

    const octRows = (await versionsOf(userId)).filter((r) => r.fromMonth === "2026-10-01");
    expect(octRows.map((r) => [r.name, r.percentMicro])).toEqual([
      ["A", 70000000],
      ["B", 30000000],
    ]);
  });

  it("going back to the value before this month's edit keeps the row of the month with that value", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 40000000 }, { ...b, percentMicro: 60000000 }], OCT_NOW);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 50000000 }, { ...b, percentMicro: 50000000 }], OCT_NOW);

    const octRows = (await versionsOf(userId)).filter((r) => r.fromMonth === "2026-10-01");
    expect(octRows.map((r) => [r.name, r.percentMicro])).toEqual([
      ["A", 50000000],
      ["B", 50000000],
    ]);
  });

  it("resending the same percents writes nothing", async () => {
    const userId = await insertTestUser();
    const items = await seed(userId);
    await categoriesRepo.replaceSet(userId, items, OCT_NOW);
    expect(await db.$count(categoryPercent)).toBe(2);
  });

  it("a new category gets a version at the current month and is hasPercent false before it", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    await categoriesRepo.replaceSet(
      userId,
      [
        { ...a, percentMicro: 40000000 },
        { ...b, percentMicro: 40000000 },
        { name: "C", percentMicro: 20000000, color: 3 },
      ],
      OCT_NOW,
    );
    const c = (await versionsOf(userId)).filter((r) => r.name === "C");
    expect(c).toEqual([{ name: "C", fromMonth: "2026-10-01", percentMicro: 20000000 }]);

    const sep = await categoriesRepo.listForMonth(userId, SEP, OCT_NOW);
    expect(sep.find((x) => x.name === "C")).toMatchObject({ percentMicro: 0, hasPercent: false });
    const oct = await categoriesRepo.listForMonth(userId, OCT, OCT_NOW);
    expect(oct.find((x) => x.name === "C")).toMatchObject({ percentMicro: 20000000, hasPercent: true });
  });

  it("uses the month of now at the month turn", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 40000000 }, { ...b, percentMicro: 60000000 }], OCT_NOW);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 10000000 }, { ...b, percentMicro: 90000000 }], NOV_NOW);

    expect((await versionsOf(userId)).filter((r) => r.name === "A").map((r) => [r.fromMonth, r.percentMicro])).toEqual([
      ["0001-01-01", 50000000],
      ["2026-10-01", 40000000],
      ["2026-11-01", 10000000],
    ]);
    expect((await categoriesRepo.listForMonth(userId, OCT, NOV_NOW))[0].percentMicro).toBe(40000000);
    expect((await categoriesRepo.listForMonth(userId, NOV, NOV_NOW))[0].percentMicro).toBe(10000000);
  });

  it("a sum different from 100% is rejected without writing a version", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    const result = await categoriesRepo.replaceSet(
      userId,
      [{ ...a, percentMicro: 40000000 }, { ...b, percentMicro: 40000000 }],
      OCT_NOW,
    );
    expect(result).toMatchObject({ ok: false, error: "A soma dos percentuais deve ser 100% (atual: 80%)" });
    expect(await db.$count(categoryPercent)).toBe(2);
  });

  it("rolls back versions, categories and subcategories when a write fails midway", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    // The last item's color (99) violates category_color_range after the earlier items were written.
    await expect(
      categoriesRepo.replaceSet(
        userId,
        [
          { ...a, percentMicro: 40000000, subcategories: [{ name: "Aluguel" }] },
          { name: "C", percentMicro: 20000000, color: 3 },
          { ...b, percentMicro: 40000000, color: 99 },
        ],
        OCT_NOW,
      ),
    ).rejects.toThrow();

    expect(await db.$count(categoryPercent)).toBe(2);
    expect(await db.$count(category)).toBe(2);
    expect(await db.$count(subcategory)).toBe(0);
  });
});

describe("categoriesRepo.replaceSet soft delete", () => {
  const OCT_NOW = new Date("2026-10-15T15:00:00Z");
  const SEP = { year: 2026, month: 9 };
  const OCT = { year: 2026, month: 10 };
  const THREE = [
    { name: "A", percentMicro: 50000000, color: 1 },
    { name: "B", percentMicro: 30000000, color: 2 },
    { name: "C", percentMicro: 20000000, color: 3 },
  ];

  async function seed(userId: string) {
    const rows = [];
    for (const c of THREE) rows.push({ ...c, id: (await insertCategory(userId, c)).id });
    return rows;
  }

  it("removing a category without expenses sets deleted_from and keeps row, versions and subcategories", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await db.insert(subcategory).values({ userId, categoryId: c.id, name: "Sub" });

    const result = await categoriesRepo.replaceSet(
      userId,
      [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 40000000 }],
      OCT_NOW,
    );
    expect(result).toEqual({ ok: true });

    const [row] = await db.select().from(category).where(eq(category.id, c.id));
    expect(row.deletedFrom).toBe("2026-10-01");
    expect(await db.$count(categoryPercent, eq(categoryPercent.categoryId, c.id))).toBe(1);
    expect(await db.$count(subcategory, eq(subcategory.categoryId, c.id))).toBe(1);
  });

  it("blocks removing a category with expenses and changes nothing", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await addExpenses(userId, c.id, 2);

    const result = await categoriesRepo.replaceSet(
      userId,
      [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 40000000 }],
      OCT_NOW,
    );
    expect(result).toEqual({ ok: false, error: "Esta categoria tem 2 gastos e não pode ser excluída" });
    expect(await db.$count(category, isNotNull(category.deletedFrom))).toBe(0);
    expect(await db.$count(categoryPercent)).toBe(3);
  });

  it("sending the id of a deleted category answers 'Categoria não encontrada'", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 40000000 }], OCT_NOW);

    const result = await categoriesRepo.replaceSet(userId, [a, b, c], OCT_NOW);
    expect(result).toEqual({ ok: false, error: "Categoria não encontrada" });
  });

  it("accepts a new category named like a deleted one", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 40000000 }], OCT_NOW);

    const result = await categoriesRepo.replaceSet(
      userId,
      [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 20000000 }, { name: c.name.toLowerCase(), percentMicro: 20000000, color: 3 }],
      OCT_NOW,
    );
    expect(result).toEqual({ ok: true });
    expect((await categoriesRepo.list(userId, OCT_NOW)).map((x) => x.name)).toEqual(["A", "B", "c"]);
  });

  it("a deleted category leaves list, shows before deleted_from and is absent from it on", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId);
    await categoriesRepo.replaceSet(userId, [{ ...a, percentMicro: 60000000 }, { ...b, percentMicro: 40000000 }], OCT_NOW);

    const names = async (month: { year: number; month: number }) =>
      (await categoriesRepo.listForMonth(userId, month, OCT_NOW)).map((x) => x.name);
    expect((await categoriesRepo.list(userId, OCT_NOW)).map((x) => x.name)).toEqual(["A", "B"]);
    expect(await names(SEP)).toEqual(["A", "B", "C"]);
    expect(await names(OCT)).toEqual(["A", "B"]);
    // Past month keeps the percents of the time, including the deleted category's.
    const sep = await categoriesRepo.listForMonth(userId, SEP, OCT_NOW);
    expect(sep.map((x) => x.percentMicro)).toEqual([50000000, 30000000, 20000000]);
  });
});
