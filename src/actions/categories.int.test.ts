import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { saveCategories } from "./categories";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const FIVE = [
  { name: "Custos fixos", percent: "30", color: 1 },
  { name: "Conforto", percent: "30", color: 2 },
  { name: "Metas", percent: "10", color: 3 },
  { name: "Prazeres", percent: "10", color: 4 },
  { name: "Liberdade financeira", percent: "20", color: 5 },
];

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

const names = async () => (await categoriesRepo.list(userId)).map((c) => [c.name, c.percentMicro]);

describe("saveCategories", () => {
  it("persists a set summing 100% and revalidates /", async () => {
    expect(await saveCategories(FIVE)).toEqual({ ok: true });

    expect(await names()).toEqual([
      ["Custos fixos", 30000000],
      ["Conforto", 30000000],
      ["Metas", 10000000],
      ["Prazeres", 10000000],
      ["Liberdade financeira", 20000000],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("persists the investment flag end to end", async () => {
    const input = FIVE.map((c, i) => (i === 4 ? { ...c, isInvestment: true } : c));

    expect(await saveCategories(input)).toEqual({ ok: true });
    expect((await categoriesRepo.list(userId)).map((c) => [c.name, c.isInvestment])).toEqual([
      ["Custos fixos", false],
      ["Conforto", false],
      ["Metas", false],
      ["Prazeres", false],
      ["Liberdade financeira", true],
    ]);
  });

  it("rejects a set whose sum is not 100% and persists nothing", async () => {
    const input = FIVE.map((c, i) => (i === 1 ? { ...c, percent: "25" } : c));

    expect(await saveCategories(input)).toMatchObject({
      ok: false,
      error: "A soma dos percentuais deve ser 100% (atual: 95%)",
    });
    expect(await names()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["0", "O percentual deve estar entre 0,000001 e 100"],
    ["100,000001", "O percentual deve estar entre 0,000001 e 100"],
    ["12,3456789", "Percentual inválido. Use um número com até 6 casas decimais"],
  ])("rejects percent %s with a field error and persists nothing", async (percent, message) => {
    const result = await saveCategories([{ name: "Tudo", percent, color: 1 }]);

    expect(result).toMatchObject({ ok: false, fieldErrors: { "0.percent": message } });
    expect(await names()).toEqual([]);
  });

  it.each([
    ["", "Informe o nome da categoria"],
    ["x".repeat(41), "O nome deve ter no máximo 40 caracteres"],
    ["conforto", "Já existe uma categoria com este nome"],
  ])("rejects name %j with a field error and persists nothing", async (name, message) => {
    const input = [
      { name: "Conforto", percent: "50", color: 1 },
      { name, percent: "50", color: 2 },
    ];

    expect(await saveCategories(input)).toMatchObject({
      ok: false,
      fieldErrors: { "1.name": message },
    });
    expect(await names()).toEqual([]);
  });

  it("blocks removing a category that has expenses, telling how many", async () => {
    await saveCategories(FIVE);
    const saved = await categoriesRepo.list(userId);
    const conforto = saved.find((c) => c.name === "Conforto")!;
    for (const amountCents of [100, 200]) {
      await transactionsRepo.create(userId, {
        id: randomUUID(),
        kind: "expense",
        amountCents,
        date: "2026-10-01",
        categoryId: conforto.id,
      });
    }
    vi.mocked(revalidatePath).mockClear();

    // Conforto (30%) removed; Metas goes from 10% to 40% so the set still sums 100%.
    const withoutConforto = saved
      .filter((c) => c.id !== conforto.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        percent: c.name === "Metas" ? "40" : String(c.percentMicro / 1_000_000),
        color: c.color,
      }));

    expect(await saveCategories(withoutConforto)).toEqual({
      ok: false,
      error: "Esta categoria tem 2 gastos e não pode ser excluída",
    });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("persists the chosen color index of each category", async () => {
    const input = FIVE.map((c, i) => ({ ...c, color: [7, 7, 1, 8, 2][i] }));

    expect(await saveCategories(input)).toEqual({ ok: true });
    expect((await categoriesRepo.list(userId)).map((c) => [c.name, c.color])).toEqual([
      ["Custos fixos", 7],
      ["Conforto", 7],
      ["Metas", 1],
      ["Prazeres", 8],
      ["Liberdade financeira", 2],
    ]);
  });

  it("rejects a color outside 1..8 on its row and changes nothing", async () => {
    await saveCategories(FIVE);
    const saved = await categoriesRepo.list(userId);
    vi.mocked(revalidatePath).mockClear();
    const edited = saved.map((c, i) => ({
      id: c.id,
      name: c.name,
      percent: String(c.percentMicro / 1_000_000),
      color: i === 1 ? 9 : 6,
    }));

    expect(await saveCategories(edited)).toMatchObject({
      ok: false,
      fieldErrors: { "1.color": "Cor inválida" },
    });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const replaceSet = vi.spyOn(categoriesRepo, "replaceSet");

    expect(await saveCategories(FIVE)).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(replaceSet).not.toHaveBeenCalled();
    expect(await db.$count(category)).toBe(0);
  });

  it("returns the generic message when the database fails", async () => {
    vi.spyOn(categoriesRepo, "replaceSet").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveCategories(FIVE)).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("saveCategories subcategories", () => {
  const withSubs = (...subs: { id?: string; name: string }[]) =>
    FIVE.map((c) => ({ ...c, subcategories: c.name === "Conforto" ? subs : [] }));

  it("persists the subcategories under their category and revalidates /", async () => {
    expect(await saveCategories(withSubs({ name: "Restaurante" }, { name: "Streaming" }))).toEqual({
      ok: true,
    });

    const conforto = (await categoriesRepo.list(userId)).find((c) => c.name === "Conforto")!;
    expect(conforto.subcategories.map((s) => s.name)).toEqual(["Restaurante", "Streaming"]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects a repeated name in the category at its field and persists nothing", async () => {
    const result = await saveCategories(withSubs({ name: "Restaurante" }, { name: "restaurante" }));

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        "1.subcategories.1.name": "Já existe uma subcategoria com esse nome nesta categoria",
      },
    });
    expect(await names()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("blocks removing a subcategory that has expenses, telling how many, and persists nothing", async () => {
    await saveCategories(withSubs({ name: "Restaurante" }, { name: "Streaming" }));
    const saved = await categoriesRepo.list(userId);
    const conforto = saved.find((c) => c.name === "Conforto")!;
    const [restaurante, streaming] = conforto.subcategories;
    for (const amountCents of [100, 200, 300]) {
      await transactionsRepo.create(userId, {
        id: randomUUID(),
        kind: "expense",
        amountCents,
        date: "2026-10-01",
        categoryId: conforto.id,
        subcategoryId: restaurante.id,
      });
    }
    vi.mocked(revalidatePath).mockClear();

    // Restaurante removed; the rename of "Metas" must not persist either.
    const input = saved.map((c) => ({
      id: c.id,
      name: c.name === "Metas" ? "Objetivos" : c.name,
      percent: String(c.percentMicro / 1_000_000),
      color: c.color,
      subcategories: c.id === conforto.id ? [{ id: streaming.id, name: streaming.name }] : [],
    }));
    const message = "Esta subcategoria tem 3 gastos e não pode ser excluída";

    expect(await saveCategories(input)).toEqual({
      ok: false,
      error: message,
      fieldErrors: { "1.subcategories": message },
    });
    expect(await categoriesRepo.list(userId)).toEqual(saved);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the generic message when the database fails while saving subcategories", async () => {
    vi.spyOn(categoriesRepo, "replaceSet").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveCategories(withSubs({ name: "Restaurante" }))).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
