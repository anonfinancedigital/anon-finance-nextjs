import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, categoryPercent, subcategory } from "@/lib/db/schema";
import { currentMonth } from "@/lib/domain/month";
import type { CategorySetDto } from "@/lib/vault/types";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { saveCategoriesSealed } from "./categories-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const GENERIC = "Não foi possível salvar. Tente novamente";
const FROM_MONTH = "2026-10-01";

type Item = CategorySetDto["items"][number];

let userId: string;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const item = (n: number, overrides: Partial<Item> = {}): Item => ({
  clientId: randomUUID(),
  color: n,
  isInvestment: false,
  nameCt: `v1:nome${n}`,
  percentChange: { fromMonth: FROM_MONTH, percentCt: `v1:pct${n}` },
  subcategories: [],
  ...overrides,
});

const five = (): CategorySetDto => ({ items: [1, 2, 3, 4, 5].map((n) => item(n)) });

const stored = () => categoriesRepo.listForMonthSealed(userId, currentMonth(new Date()));
const rawCategories = () => db.select().from(category).where(eq(category.userId, userId));

describe("saveCategoriesSealed", () => {
  it("stores only ciphertext (v1:) with the client's ids and revalidates /", async () => {
    const dto = five();

    expect(await saveCategoriesSealed(dto)).toEqual({ ok: true });

    const raw = await rawCategories();
    expect(raw.map((r) => r.id).sort()).toEqual(dto.items.map((i) => i.clientId).sort());
    for (const row of raw) {
      expect(row.nameCt!.startsWith("v1:")).toBe(true);
      expect(row.name).toBeNull();
    }
    const versions = await db.select().from(categoryPercent);
    expect(versions).toHaveLength(5);
    for (const v of versions) {
      expect(v.percentCt!.startsWith("v1:")).toBe(true);
      expect(v.percentMicro).toBeNull();
    }
    expect((await stored()).map((c) => [c.nameCt, c.color])).toEqual(
      dto.items.map((i) => [i.nameCt, i.color]),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("persists the investment flag and the chosen color of each category", async () => {
    const dto: CategorySetDto = {
      items: [item(7, { isInvestment: true }), item(1), item(8)],
    };

    expect(await saveCategoriesSealed(dto)).toEqual({ ok: true });

    expect((await stored()).map((c) => [c.color, c.isInvestment])).toEqual([
      [7, true],
      [1, false],
      [8, false],
    ]);
  });

  it("stores subcategories sealed under their category, with the ids the client chose", async () => {
    const subId = randomUUID();
    const dto: CategorySetDto = {
      items: [item(1, { subcategories: [{ id: subId, nameCt: "v1:restaurante" }, { id: randomUUID(), nameCt: "v1:streaming" }] })],
    };

    expect(await saveCategoriesSealed(dto)).toEqual({ ok: true });

    const subs = await db.select().from(subcategory);
    expect(subs).toHaveLength(2);
    expect(subs.find((s) => s.id === subId)).toMatchObject({ nameCt: "v1:restaurante", name: null });
    expect(subs.every((s) => s.nameCt!.startsWith("v1:"))).toBe(true);
  });

  it("accepts exactly 30 subcategories and rejects 31 at the category's field", async () => {
    const subs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: randomUUID(), nameCt: `v1:s${i}` }));

    const tooMany = await saveCategoriesSealed({ items: [item(1), item(2, { subcategories: subs(31) })] });
    expect(tooMany).toMatchObject({
      ok: false,
      fieldErrors: { "1.subcategories": "No máximo 30 subcategorias por categoria" },
    });
    expect(await rawCategories()).toEqual([]);

    expect(await saveCategoriesSealed({ items: [item(2, { subcategories: subs(30) })] })).toEqual({ ok: true });
    expect(await db.$count(subcategory)).toBe(30);
  });

  it.each([0, 9, -1, 1.5, "1", null])("rejects color %j at its row and persists nothing", async (bad) => {
    const dto = five();
    dto.items[1] = item(2, { color: bad as number });

    expect(await saveCategoriesSealed(dto)).toMatchObject({
      ok: false,
      fieldErrors: { "1.color": "Cor inválida" },
    });
    expect(await rawCategories()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["clientId", { clientId: "nao-uuid" }, "0.clientId"],
    ["id", { id: "nao-uuid" }, "0.id"],
    ["subcategory id", { subcategories: [{ id: "nao-uuid", nameCt: "v1:x" }] }, "0.subcategories.0.id"],
  ])("rejects a non-uuid %s with a field error and persists nothing", async (_, overrides, key) => {
    expect(await saveCategoriesSealed({ items: [item(1, overrides as Partial<Item>)] })).toMatchObject({
      ok: false,
      fieldErrors: { [key]: "Identificador inválido" },
    });
    expect(await rawCategories()).toEqual([]);
  });

  it.each([
    ["name without the v1: prefix", { nameCt: "Conforto" }],
    ["name with the v2: prefix", { nameCt: "v2:abc" }],
    ["name longer than 2048", { nameCt: `v1:${"a".repeat(2046)}` }],
    ["percent", { percentChange: { fromMonth: FROM_MONTH, percentCt: "30" } }],
    ["subcategory name", { subcategories: [{ id: randomUUID(), nameCt: "Restaurante" }] }],
  ])("answers SAVE_FAILED and persists nothing for a malformed %s", async (_, overrides) => {
    const dto = five();
    dto.items[2] = item(3, overrides as Partial<Item>);

    expect(await saveCategoriesSealed(dto)).toEqual({ ok: false, error: GENERIC });
    expect(await rawCategories()).toEqual([]);
    expect(await db.$count(categoryPercent)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a payload that is not an item list", async () => {
    expect(await saveCategoriesSealed({ items: "x" } as unknown as CategorySetDto)).toMatchObject({
      ok: false,
      error: "Categorias inválidas",
    });
    expect(await saveCategoriesSealed(null as unknown as CategorySetDto)).toMatchObject({ ok: false });
    expect(await rawCategories()).toEqual([]);
  });

  it("is atomic: a duplicated clientId rolls the whole save back", async () => {
    const dto = five();
    dto.items[4] = item(5, { clientId: dto.items[0].clientId });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveCategoriesSealed(dto)).toEqual({ ok: false, error: GENERIC });
    expect(await rawCategories()).toEqual([]);
    expect(await db.$count(categoryPercent)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 'Categoria não encontrada' for an id that is not the user's", async () => {
    const otherUser = await insertTestUser();
    const [foreign] = await db.insert(category).values({ userId: otherUser, nameCt: "v1:dele", color: 1 }).returning();

    expect(await saveCategoriesSealed({ items: [item(1, { id: foreign.id })] })).toEqual({
      ok: false,
      error: "Categoria não encontrada",
    });
    expect(await rawCategories()).toEqual([]);
  });

  it("blocks removing a category that has expenses, telling how many, and keeps the set", async () => {
    const dto = five();
    await saveCategoriesSealed(dto);
    const target = dto.items[1].clientId;
    for (const n of [1, 2]) {
      await transactionsRepo.createSealed(userId, {
        id: randomUUID(),
        kind: "expense",
        date: "2026-10-01",
        categoryId: target,
        subcategoryId: null,
        amountCt: `v1:v${n}`,
        descriptionCt: null,
        recurrence: "none",
      });
    }
    const before = await stored();
    vi.mocked(revalidatePath).mockClear();

    const withoutTarget: CategorySetDto = {
      items: dto.items.filter((i) => i.clientId !== target).map((i) => ({ ...i, id: i.clientId, percentChange: undefined })),
    };

    expect(await saveCategoriesSealed(withoutTarget)).toEqual({
      ok: false,
      error: "Esta categoria tem 2 gastos e não pode ser excluída",
    });
    expect(await stored()).toEqual(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("blocks removing a subcategory that has expenses, telling how many, and keeps the set", async () => {
    const keepSub = { id: randomUUID(), nameCt: "v1:streaming" };
    const dropSub = { id: randomUUID(), nameCt: "v1:restaurante" };
    const dto: CategorySetDto = {
      items: [item(1, { subcategories: [dropSub, keepSub] }), ...[2, 3].map((n) => item(n))],
    };
    await saveCategoriesSealed(dto);
    const target = dto.items[0].clientId;
    for (const n of [1, 2, 3]) {
      await transactionsRepo.createSealed(userId, {
        id: randomUUID(),
        kind: "expense",
        date: "2026-10-01",
        categoryId: target,
        subcategoryId: dropSub.id,
        amountCt: `v1:v${n}`,
        descriptionCt: null,
        recurrence: "none",
      });
    }
    const before = await stored();
    vi.mocked(revalidatePath).mockClear();

    const withoutSub: CategorySetDto = {
      items: dto.items.map((i) => ({
        ...i,
        id: i.clientId,
        percentChange: undefined,
        subcategories: i.clientId === target ? [keepSub] : [],
      })),
    };
    const message = "Esta subcategoria tem 3 gastos e não pode ser excluída";

    expect(await saveCategoriesSealed(withoutSub)).toMatchObject({ ok: false, error: message });
    expect(await stored()).toEqual(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const replace = vi.spyOn(categoriesRepo, "replaceSetSealed");

    expect(await saveCategoriesSealed(five())).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(replace).not.toHaveBeenCalled();
    expect(await db.$count(category)).toBe(0);
  });

  it("returns the generic message and logs only the code when the database fails", async () => {
    vi.spyOn(categoriesRepo, "replaceSetSealed").mockRejectedValueOnce(
      Object.assign(new Error("nome Conforto"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveCategoriesSealed(five())).toEqual({ ok: false, error: GENERIC });
    expect(consoleError).toHaveBeenCalledWith("saveCategoriesSealed", "08006");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
