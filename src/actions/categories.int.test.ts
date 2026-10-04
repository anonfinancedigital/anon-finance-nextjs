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
  { name: "Custos fixos", percent: "30" },
  { name: "Conforto", percent: "30" },
  { name: "Metas", percent: "10" },
  { name: "Prazeres", percent: "10" },
  { name: "Liberdade financeira", percent: "20" },
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

const names = async () => (await categoriesRepo.list(userId)).map((c) => [c.name, c.percentBp]);

describe("saveCategories", () => {
  it("persists a set summing 100% and revalidates /", async () => {
    expect(await saveCategories(FIVE)).toEqual({ ok: true });

    expect(await names()).toEqual([
      ["Custos fixos", 3000],
      ["Conforto", 3000],
      ["Metas", 1000],
      ["Prazeres", 1000],
      ["Liberdade financeira", 2000],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
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
    ["0", "O percentual deve estar entre 0,01 e 100"],
    ["100,01", "O percentual deve estar entre 0,01 e 100"],
    ["12,345", "Percentual inválido. Use um número com até 2 casas decimais"],
  ])("rejects percent %s with a field error and persists nothing", async (percent, message) => {
    const result = await saveCategories([{ name: "Tudo", percent }]);

    expect(result).toMatchObject({ ok: false, fieldErrors: { "0.percent": message } });
    expect(await names()).toEqual([]);
  });

  it.each([
    ["", "Informe o nome da categoria"],
    ["x".repeat(41), "O nome deve ter no máximo 40 caracteres"],
    ["conforto", "Já existe uma categoria com este nome"],
  ])("rejects name %j with a field error and persists nothing", async (name, message) => {
    const input = [
      { name: "Conforto", percent: "50" },
      { name, percent: "50" },
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
        percent: c.name === "Metas" ? "40" : String(c.percentBp / 100),
      }));

    expect(await saveCategories(withoutConforto)).toEqual({
      ok: false,
      error: "Esta categoria tem 2 gastos e não pode ser excluída",
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
