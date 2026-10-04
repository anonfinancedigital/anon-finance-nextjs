import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { createTransaction } from "./transactions";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const OCTOBER = { start: "2026-10-01", endExclusive: "2026-11-01" };

let userId: string;
let categoryId: string;

async function insertCategory(owner: string) {
  const [row] = await db
    .insert(category)
    .values({ userId: owner, name: "Conforto", percentBp: 10000 })
    .returning({ id: category.id });
  return row.id;
}

const expense = (overrides: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  kind: "expense" as const,
  amount: "200,00",
  date: "2026-10-15",
  categoryId,
  description: "Cinema",
  ...overrides,
});

const income = () => ({
  id: randomUUID(),
  kind: "income" as const,
  amount: "5.000,00",
  date: "2026-10-05",
  description: "Salário",
});

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
  categoryId = await insertCategory(userId);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createTransaction", () => {
  it("persists a valid expense in the month of its date and revalidates /", async () => {
    const input = expense();

    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      {
        id: input.id,
        kind: "expense",
        amountCents: 20000,
        date: "2026-10-15",
        categoryId,
        description: "Cinema",
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("persists a valid income into the month's revenue and revalidates /", async () => {
    const input = income();

    expect(await createTransaction(input)).toEqual({ ok: true });

    const totals = await transactionsRepo.monthTotals(userId, OCTOBER);
    expect(totals.incomeCents).toBe(500000);
    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      { id: input.id, kind: "income", categoryId: null, description: "Salário" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it.each([
    ["amount", { amount: "0" }, "O valor deve ser maior que zero"],
    ["amount", { amount: "1.000.000.000,00" }, "O valor máximo é R$ 999.999.999,99"],
    ["date", { date: "" }, "Informe a data"],
    ["date", { date: "2026-02-29" }, "Data inválida"],
    ["categoryId", { categoryId: undefined }, "Selecione uma categoria"],
  ])("rejects an invalid %s (%j) with a field error", async (field, overrides, message) => {
    const result = await createTransaction(expense(overrides));

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: message } });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a category that does not exist", async () => {
    const result = await createTransaction(expense({ categoryId: randomUUID() }));

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { categoryId: "Categoria não encontrada" },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("rejects a category of another user", async () => {
    const otherCategory = await insertCategory(await insertTestUser());

    const result = await createTransaction(expense({ categoryId: otherCategory }));

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { categoryId: "Categoria não encontrada" },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("creates a single transaction when the same id is sent twice", async () => {
    const input = expense();

    expect(await createTransaction(input)).toEqual({ ok: true });
    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(1);
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const create = vi.spyOn(transactionsRepo, "create");

    expect(await createTransaction(expense())).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(create).not.toHaveBeenCalled();
    expect(await db.$count(transaction)).toBe(0);
  });

  it("returns the generic message when the database fails", async () => {
    vi.spyOn(transactionsRepo, "create").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await createTransaction(expense())).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
