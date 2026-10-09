import { randomUUID } from "node:crypto";
import { eq, isNotNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import type { CategorySetDto } from "@/lib/vault/types";
import { db } from "../client";
import { category, categoryPercent, subcategory, transaction } from "../schema";
import { categoriesRepo } from "./categories";

setupTestDb();

const NOW = new Date("2026-10-15T15:00:00Z"); // October 2026 in America/Sao_Paulo
const OCT = { year: 2026, month: 10 };

/** Inserts a sealed category and its sealed percent versions; returns the category id. */
async function insertSealed(
  userId: string,
  input: {
    nameCt: string;
    color?: number;
    isInvestment?: boolean;
    deletedFrom?: string;
    versions?: { fromMonth: string; percentCt: string }[];
  },
) {
  const [row] = await db
    .insert(category)
    .values({
      userId,
      nameCt: input.nameCt,
      color: input.color ?? 1,
      isInvestment: input.isInvestment ?? false,
      deletedFrom: input.deletedFrom,
    })
    .returning({ id: category.id });
  for (const v of input.versions ?? [{ fromMonth: "0001-01-01", percentCt: "v1:p" }]) {
    await db.insert(categoryPercent).values({ categoryId: row.id, ...v });
  }
  return row.id;
}

describe("categoriesRepo.listForMonthSealed", () => {
  it("returns every percent version with the sealed name, whichever month is asked", async () => {
    const userId = await insertTestUser();
    const id = await insertSealed(userId, {
      nameCt: "v1:nomea",
      color: 3,
      isInvestment: true,
      versions: [
        { fromMonth: "0001-01-01", percentCt: "v1:p50" },
        { fromMonth: "2026-10-01", percentCt: "v1:p40" },
      ],
    });

    const expected = [
      {
        id,
        color: 3,
        isInvestment: true,
        deleted: false,
        nameCt: "v1:nomea",
        versions: [
          { fromMonth: "0001-01-01", percentCt: "v1:p50" },
          { fromMonth: "2026-10-01", percentCt: "v1:p40" },
        ],
        subcategories: [],
      },
    ];
    expect(await categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 9 }, NOW)).toEqual(expected);
    expect(await categoriesRepo.listForMonthSealed(userId, OCT, NOW)).toEqual(expected);
    expect(await categoriesRepo.listForMonthSealed(userId, { year: 2027, month: 3 }, NOW)).toEqual(expected);
  });

  it("orders the versions by from_month regardless of insertion order", async () => {
    const userId = await insertTestUser();
    await insertSealed(userId, {
      nameCt: "v1:a",
      versions: [
        { fromMonth: "2026-10-01", percentCt: "v1:c" },
        { fromMonth: "0001-01-01", percentCt: "v1:a" },
        { fromMonth: "2026-05-01", percentCt: "v1:b" },
      ],
    });

    const [cat] = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(cat.versions.map((v) => v.percentCt)).toEqual(["v1:a", "v1:b", "v1:c"]);
  });

  it("lists the categories in creation order", async () => {
    const userId = await insertTestUser();
    for (const nameCt of ["v1:primeira", "v1:segunda", "v1:terceira"]) {
      await insertSealed(userId, { nameCt });
    }

    const listed = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(listed.map((c) => c.nameCt)).toEqual(["v1:primeira", "v1:segunda", "v1:terceira"]);
  });

  it("shows a deleted category before deleted_from, flagged deleted, and hides it from that month on", async () => {
    const userId = await insertTestUser();
    await insertSealed(userId, { nameCt: "v1:fica" });
    await insertSealed(userId, { nameCt: "v1:sai", deletedFrom: "2026-10-01" });

    const sep = await categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 9 }, NOW);
    expect(sep.map((c) => [c.nameCt, c.deleted])).toEqual([
      ["v1:fica", false],
      ["v1:sai", true],
    ]);
    expect(sep.every((c) => !("deletedFrom" in c))).toBe(true);
    const names = async (month: { year: number; month: number }) =>
      (await categoriesRepo.listForMonthSealed(userId, month, NOW)).map((c) => c.nameCt);
    expect(await names(OCT)).toEqual(["v1:fica"]);
    expect(await names({ year: 2026, month: 11 })).toEqual(["v1:fica"]);
  });

  it("lists each category's subcategories in creation order, empty when it has none", async () => {
    const userId = await insertTestUser();
    const a = await insertSealed(userId, { nameCt: "v1:a" });
    const b = await insertSealed(userId, { nameCt: "v1:b" });
    const subs: { id: string; nameCt: string }[] = [];
    for (const nameCt of ["v1:streaming", "v1:restaurante", "v1:cinema"]) {
      const [row] = await db
        .insert(subcategory)
        .values({ userId, categoryId: b, nameCt })
        .returning({ id: subcategory.id });
      subs.push({ id: row.id, nameCt });
    }

    const listed = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(listed.find((c) => c.id === a)!.subcategories).toEqual([]);
    expect(listed.find((c) => c.id === b)!.subcategories).toEqual(subs);
  });

  it("returns only the categories and subcategories of the requested user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    const mine = await insertSealed(userId, { nameCt: "v1:minha" });
    const theirs = await insertSealed(otherId, { nameCt: "v1:dela" });
    await db.insert(subcategory).values({ userId, categoryId: mine, nameCt: "v1:sub" });
    await db.insert(subcategory).values({ userId: otherId, categoryId: theirs, nameCt: "v1:segredo" });

    const result = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(result.map((c) => c.nameCt)).toEqual(["v1:minha"]);
    expect(result[0].subcategories.map((s) => s.nameCt)).toEqual(["v1:sub"]);
  });

  it("exposes no plain-text name or percent field, and the raw columns hold only ciphertext", async () => {
    const userId = await insertTestUser();
    const id = await insertSealed(userId, { nameCt: "v1:nome" });
    await db.insert(subcategory).values({ userId, categoryId: id, nameCt: "v1:sub" });

    const [cat] = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(Object.keys(cat).sort()).toEqual(
      ["color", "deleted", "id", "isInvestment", "nameCt", "subcategories", "versions"],
    );
    expect(Object.keys(cat.versions[0]).sort()).toEqual(["fromMonth", "percentCt"]);
    expect(Object.keys(cat.subcategories[0]).sort()).toEqual(["id", "nameCt"]);

    const [rawCategory] = await db.select().from(category).where(eq(category.id, id));
    expect(rawCategory.nameCt!.startsWith("v1:")).toBe(true);
    expect(rawCategory.name).toBeNull();
    const [rawPercent] = await db.select().from(categoryPercent).where(eq(categoryPercent.categoryId, id));
    expect(rawPercent.percentCt!.startsWith("v1:")).toBe(true);
    expect(rawPercent.percentMicro).toBeNull();
    const [rawSub] = await db.select().from(subcategory).where(eq(subcategory.categoryId, id));
    expect(rawSub.nameCt!.startsWith("v1:")).toBe(true);
    expect(rawSub.name).toBeNull();
  });
});

describe("categoriesRepo.replaceSetSealed", () => {
  // 31 Oct 2026 23:30 and 1 Nov 2026 00:30 in America/Sao_Paulo (UTC-3).
  const OCT_NOW = new Date("2026-10-31T23:30:00-03:00");
  const NOV_NOW = new Date("2026-11-01T00:30:00-03:00");
  const SEP = { year: 2026, month: 9 };

  type Item = CategorySetDto["items"][number];
  /** New category: no `id`, the client's uuid as `clientId`. */
  const created = (nameCt: string, percentCt?: string, extra: Partial<Item> = {}): Item => ({
    clientId: randomUUID(),
    color: 1,
    isInvestment: false,
    nameCt,
    percentChange: percentCt ? { fromMonth: "2026-10-01", percentCt } : undefined,
    subcategories: [],
    ...extra,
  });
  /** Existing category as the browser resends it: `id` = `clientId`. */
  const kept = (id: string, nameCt: string, extra: Partial<Item> = {}): Item => ({
    id,
    clientId: id,
    color: 1,
    isInvestment: false,
    nameCt,
    subcategories: [],
    ...extra,
  });
  const save = (userId: string, items: Item[], now = OCT_NOW) =>
    categoriesRepo.replaceSetSealed(userId, { items }, now);
  const list = (userId: string, now = OCT_NOW) =>
    categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 10 }, now);
  async function addExpenses(userId: string, categoryId: string, n: number, subcategoryId?: string) {
    for (let i = 0; i < n; i++) {
      await db.insert(transaction).values({
        id: randomUUID(),
        userId,
        kind: "expense",
        amountCt: "v1:g",
        date: "2026-10-04",
        categoryId,
        subcategoryId,
      });
    }
  }
  /** Creates A, B (and C) with ids from the client; returns the kept-style items. */
  async function seed(userId: string, names = ["v1:A", "v1:B", "v1:C"]) {
    const items = names.map((n) => created(n, `v1:p:${n}`));
    expect(await save(userId, items)).toEqual({ ok: true });
    return items.map((i) => kept(i.clientId, i.nameCt));
  }

  it("creates categories with the client ids, in order, with the version at the current month", async () => {
    const userId = await insertTestUser();
    const a = created("v1:nomea", "v1:p40", { color: 4, isInvestment: true });
    const b = created("v1:nomeb", "v1:p60");

    expect(await save(userId, [a, b])).toEqual({ ok: true });

    expect((await list(userId)).map((c) => [c.id, c.nameCt, c.color, c.isInvestment, c.versions])).toEqual([
      [a.clientId, "v1:nomea", 4, true, [{ fromMonth: "2026-10-01", percentCt: "v1:p40" }]],
      [b.clientId, "v1:nomeb", 1, false, [{ fromMonth: "2026-10-01", percentCt: "v1:p60" }]],
    ]);
  });

  it("stores only ciphertext: raw *_ct columns hold v1: and the plain-text columns are NULL", async () => {
    const userId = await insertTestUser();
    const a = created("v1:nome", "v1:pct", {
      subcategories: [{ id: randomUUID(), nameCt: "v1:sub" }],
    });
    await save(userId, [a]);

    const [c] = await db.select().from(category).where(eq(category.userId, userId));
    expect(c.nameCt!.startsWith("v1:")).toBe(true);
    expect(c.name).toBeNull();
    const [p] = await db.select().from(categoryPercent);
    expect(p.percentCt!.startsWith("v1:")).toBe(true);
    expect(p.percentMicro).toBeNull();
    const [s] = await db.select().from(subcategory);
    expect(s.nameCt!.startsWith("v1:")).toBe(true);
    expect(s.name).toBeNull();
  });

  it("resending an existing category toggles the investment flag both ways", async () => {
    const userId = await insertTestUser();
    const items = [created("v1:A", "v1:pa"), created("v1:B", "v1:pb", { isInvestment: true })];
    await save(userId, items);
    const flags = async () => (await list(userId)).map((c) => [c.nameCt, c.isInvestment]);
    expect(await flags()).toEqual([["v1:A", false], ["v1:B", true]]);

    await save(userId, items.map((i) => kept(i.clientId, i.nameCt, { isInvestment: !i.isInvestment })));

    expect(await flags()).toEqual([["v1:A", true], ["v1:B", false]]);
  });

  it("updates existing categories in place when ids are sent (rename and recolor)", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);

    expect(
      await save(userId, [{ ...a, nameCt: "v1:casa", color: 5, isInvestment: true }, b, c]),
    ).toEqual({ ok: true });

    expect((await list(userId)).map((x) => [x.id, x.nameCt, x.color, x.isInvestment])).toEqual([
      [a.id, "v1:casa", 5, true],
      [b.id, "v1:B", 1, false],
      [c.id, "v1:C", 1, false],
    ]);
    expect(await db.$count(category)).toBe(3);
  });

  it("writes no version without percentChange and keeps the earlier ones", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);

    await save(userId, [{ ...a, nameCt: "v1:casa", color: 5, subcategories: [{ id: randomUUID(), nameCt: "v1:x" }] }, b, c]);

    expect(await db.$count(categoryPercent)).toBe(3);
  });

  it("with percentChange writes a version at the month of now, keeping past months", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId, ["v1:A", "v1:B"]);
    // Move the seed's versions to "since ever", as an account that predates the month.
    await db.update(categoryPercent).set({ fromMonth: "0001-01-01" });

    await save(userId, [
      { ...a, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:novoa" } },
      { ...b, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:novob" } },
    ]);

    const byCat = (await list(userId)).map((c) => [c.nameCt, c.versions]);
    expect(byCat).toEqual([
      ["v1:A", [{ fromMonth: "0001-01-01", percentCt: "v1:p:v1:A" }, { fromMonth: "2026-10-01", percentCt: "v1:novoa" }]],
      ["v1:B", [{ fromMonth: "0001-01-01", percentCt: "v1:p:v1:B" }, { fromMonth: "2026-10-01", percentCt: "v1:novob" }]],
    ]);
  });

  it("saving twice in the same month keeps one row per category with the last value (upsert)", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);

    await save(userId, [{ ...a, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:um" } }]);
    await save(userId, [{ ...a, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:dois" } }]);

    const rows = await db.select().from(categoryPercent);
    expect(rows.map((r) => [r.fromMonth, r.percentCt, r.percentMicro])).toEqual([
      ["2026-10-01", "v1:dois", null],
    ]);
  });

  it("uses the month of now in America/Sao_Paulo at the month turn, ignoring the DTO's fromMonth", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);

    await save(userId, [{ ...a, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:nov" } }], NOV_NOW);

    const [cat] = await categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 11 }, NOV_NOW);
    expect(cat.versions).toEqual([
      { fromMonth: "2026-10-01", percentCt: "v1:p:v1:A" },
      { fromMonth: "2026-11-01", percentCt: "v1:nov" },
    ]);
  });

  it("removing a category without expenses sets deleted_from and keeps row, versions and subcategories", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await db.insert(subcategory).values({ userId, categoryId: c.id!, nameCt: "v1:sub" });

    expect(await save(userId, [a, b])).toEqual({ ok: true });

    const [row] = await db.select().from(category).where(eq(category.id, c.id!));
    expect(row.deletedFrom).toBe("2026-10-01");
    expect(await db.$count(categoryPercent, eq(categoryPercent.categoryId, c.id!))).toBe(1);
    expect(await db.$count(subcategory, eq(subcategory.categoryId, c.id!))).toBe(1);
    expect((await list(userId)).map((x) => x.id)).toEqual([a.id, b.id]);
    expect((await categoriesRepo.listForMonthSealed(userId, SEP, OCT_NOW)).map((x) => x.id)).toEqual([a.id, b.id, c.id]);
  });

  it("blocks removing a category with expenses and changes nothing", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await addExpenses(userId, c.id!, 2);
    const before = await list(userId);

    const result = await save(userId, [{ ...a, nameCt: "v1:mudou" }, b]);

    expect(result).toEqual({ ok: false, error: "Esta categoria tem 2 gastos e não pode ser excluída" });
    expect(await db.$count(category, isNotNull(category.deletedFrom))).toBe(0);
    expect(await list(userId)).toEqual(before);
  });

  it("uses the singular for a category with one expense", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await addExpenses(userId, c.id!, 1);

    expect(await save(userId, [a, b])).toEqual({
      ok: false,
      error: "Esta categoria tem 1 gasto e não pode ser excluída",
    });
  });

  it("answers 'Categoria não encontrada' for the id of a deleted category", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await save(userId, [a, b]);

    expect(await save(userId, [a, b, c])).toEqual({ ok: false, error: "Categoria não encontrada" });
  });

  it("answers 'Categoria não encontrada' for the id of another user's category and writes nothing", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    const [theirs] = await seed(otherId, ["v1:dela"]);
    const before = await db.$count(category);

    const result = await save(userId, [theirs, created("v1:minha", "v1:p")]);

    expect(result).toEqual({ ok: false, error: "Categoria não encontrada" });
    expect(await db.$count(category)).toBe(before);
    expect((await list(otherId))[0].nameCt).toBe("v1:dela");
  });

  it("accepts a new category with the same ciphertext name as a deleted one", async () => {
    const userId = await insertTestUser();
    const [a, b, c] = await seed(userId);
    await save(userId, [a, b]);

    expect(await save(userId, [a, b, created(c.nameCt, "v1:p")])).toEqual({ ok: true });
    expect((await list(userId)).map((x) => x.nameCt)).toEqual(["v1:A", "v1:B", "v1:C"]);
  });

  it("creates a new category with subcategories, new subcategory ids coming from the client", async () => {
    const userId = await insertTestUser();
    const s1 = randomUUID();
    const s2 = randomUUID();
    const a = created("v1:conforto", "v1:p", {
      subcategories: [
        { id: s1, nameCt: "v1:restaurante" },
        { id: s2, nameCt: "v1:streaming" },
      ],
    });

    expect(await save(userId, [a])).toEqual({ ok: true });

    expect((await list(userId))[0].subcategories).toEqual([
      { id: s1, nameCt: "v1:restaurante" },
      { id: s2, nameCt: "v1:streaming" },
    ]);
  });

  it("renames a subcategory keeping its id and its expenses", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);
    const subId = randomUUID();
    await save(userId, [{ ...a, subcategories: [{ id: subId, nameCt: "v1:rest" }] }]);
    await addExpenses(userId, a.id!, 2, subId);

    expect(
      await save(userId, [{ ...a, subcategories: [{ id: subId, nameCt: "v1:almoco" }] }]),
    ).toEqual({ ok: true });

    expect((await list(userId))[0].subcategories).toEqual([{ id: subId, nameCt: "v1:almoco" }]);
    expect(await db.$count(transaction, eq(transaction.subcategoryId, subId))).toBe(2);
    expect(await db.$count(subcategory)).toBe(1);
  });

  it("removes a subcategory without expenses", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);
    const keep = { id: randomUUID(), nameCt: "v1:fica" };
    await save(userId, [{ ...a, subcategories: [keep, { id: randomUUID(), nameCt: "v1:sai" }] }]);

    expect(await save(userId, [{ ...a, subcategories: [keep] }])).toEqual({ ok: true });

    expect((await list(userId))[0].subcategories).toEqual([keep]);
  });

  it("blocks removing a subcategory with expenses and changes nothing in the set", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId, ["v1:A", "v1:B"]);
    const rest = { id: randomUUID(), nameCt: "v1:rest" };
    const stream = { id: randomUUID(), nameCt: "v1:stream" };
    await save(userId, [{ ...a, subcategories: [rest, stream] }, b]);
    await addExpenses(userId, a.id!, 3, rest.id);
    const before = await list(userId);

    const result = await save(userId, [
      { ...a, subcategories: [stream] },
      { ...b, nameCt: "v1:renomeada" },
    ]);

    const message = "Esta subcategoria tem 3 gastos e não pode ser excluída";
    expect(result).toEqual({ ok: false, error: message, fieldErrors: { "0.subcategories": message } });
    expect(await list(userId)).toEqual(before);
  });

  it("keeps the category message when removing a category whose subcategory has expenses", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId, ["v1:A", "v1:B"]);
    const rest = { id: randomUUID(), nameCt: "v1:rest" };
    await save(userId, [{ ...a, subcategories: [rest] }, b]);
    await addExpenses(userId, a.id!, 2, rest.id);

    expect(await save(userId, [b])).toEqual({
      ok: false,
      error: "Esta categoria tem 2 gastos e não pode ser excluída",
    });
  });

  it("rejects a subcategory id from another category", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId, ["v1:A", "v1:B"]);
    const rest = { id: randomUUID(), nameCt: "v1:rest" };
    await save(userId, [{ ...a, subcategories: [rest] }, b]);
    const before = await list(userId);

    expect(await save(userId, [a, { ...b, subcategories: [rest] }])).toEqual({
      ok: false,
      error: "Subcategoria não encontrada",
    });
    expect(await list(userId)).toEqual(before);
  });

  it("rejects a subcategory id from another user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    const [mine] = await seed(userId, ["v1:A"]);
    const [theirs] = await seed(otherId, ["v1:dela"]);
    const secret = { id: randomUUID(), nameCt: "v1:segredo" };
    await save(otherId, [{ ...theirs, subcategories: [secret] }]);

    expect(await save(userId, [{ ...mine, subcategories: [secret] }])).toEqual({
      ok: false,
      error: "Subcategoria não encontrada",
    });
    expect((await list(otherId))[0].subcategories).toEqual([secret]);
    expect((await list(userId))[0].subcategories).toEqual([]);
  });

  it("swaps the names of two subcategories in one save", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);
    const s1 = { id: randomUUID(), nameCt: "v1:um" };
    const s2 = { id: randomUUID(), nameCt: "v1:dois" };
    await save(userId, [{ ...a, subcategories: [s1, s2] }]);

    await save(userId, [
      { ...a, subcategories: [{ id: s1.id, nameCt: "v1:dois" }, { id: s2.id, nameCt: "v1:um" }] },
    ]);

    expect((await list(userId))[0].subcategories).toEqual([
      { id: s1.id, nameCt: "v1:dois" },
      { id: s2.id, nameCt: "v1:um" },
    ]);
  });

  it("rolls back categories, versions and subcategories when a write fails midway", async () => {
    const userId = await insertTestUser();
    const [a, b] = await seed(userId, ["v1:A", "v1:B"]);

    // The last item's color (99) violates category_color_range after the earlier items were written.
    await expect(
      save(userId, [
        { ...a, percentChange: { fromMonth: "2026-10-01", percentCt: "v1:novo" }, subcategories: [{ id: randomUUID(), nameCt: "v1:s" }] },
        created("v1:nova", "v1:p"),
        { ...b, color: 99 },
      ]),
    ).rejects.toThrow();

    expect(await db.$count(categoryPercent)).toBe(2);
    expect(await db.$count(category)).toBe(2);
    expect(await db.$count(subcategory)).toBe(0);
  });

  it("fails and rolls back when the clientId of a new category already exists", async () => {
    const userId = await insertTestUser();
    const [a] = await seed(userId, ["v1:A"]);

    await expect(
      save(userId, [{ ...a, nameCt: "v1:mudou" }, created("v1:nova", "v1:p", { clientId: a.id! })]),
    ).rejects.toThrow();

    expect((await list(userId)).map((c) => c.nameCt)).toEqual(["v1:A"]);
  });
});

describe("categoriesRepo.countExpenses", () => {
  it("counts the expenses linked to a category", async () => {
    const userId = await insertTestUser();
    const withExpenses = await insertSealed(userId, { nameCt: "v1:a" });
    const without = await insertSealed(userId, { nameCt: "v1:b" });
    for (let i = 0; i < 3; i++) {
      await db.insert(transaction).values({
        id: randomUUID(),
        userId,
        kind: "expense",
        amountCt: "v1:g",
        date: "2026-10-04",
        categoryId: withExpenses,
      });
    }

    expect(await categoriesRepo.countExpenses(withExpenses)).toBe(3);
    expect(await categoriesRepo.countExpenses(without)).toBe(0);
  });
});
