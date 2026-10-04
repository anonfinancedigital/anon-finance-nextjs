import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, subcategory, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { createTransaction, deleteTransaction, updateTransaction } from "./transactions";

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
    .values({ userId: owner, name: "Conforto", percentBp: 10000, color: 1 })
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

describe("updateTransaction", () => {
  it("updates date, amount, category and description and revalidates /", async () => {
    const original = expense();
    await createTransaction(original);
    const [other] = await db
      .insert(category)
      .values({ userId, name: "Metas", percentBp: 1, color: 1 })
      .returning({ id: category.id });
    vi.mocked(revalidatePath).mockClear();

    const edited = {
      ...original,
      amount: "350,50",
      date: "2026-11-02",
      categoryId: other.id,
      description: "Curso",
    };
    expect(await updateTransaction(edited)).toEqual({ ok: true });

    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toEqual([]);
    const november = { start: "2026-11-01", endExclusive: "2026-12-01" };
    expect(await transactionsRepo.listByMonth(userId, november)).toMatchObject([
      {
        id: original.id,
        amountCents: 35050,
        date: "2026-11-02",
        categoryId: other.id,
        description: "Curso",
      },
    ]);
    const totals = await transactionsRepo.monthTotals(userId, november);
    expect(totals.spentByCategory.get(other.id)).toBe(35050);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("keeps the last of two edits received in sequence", async () => {
    const original = expense();
    await createTransaction(original);

    await updateTransaction({ ...original, amount: "10,00" });
    await updateTransaction({ ...original, amount: "20,00" });

    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      { id: original.id, amountCents: 2000 },
    ]);
  });

  it("returns field errors for invalid data and keeps the transaction unchanged", async () => {
    const original = expense();
    await createTransaction(original);
    vi.mocked(revalidatePath).mockClear();

    const result = await updateTransaction({ ...original, amount: "0", date: "2026-02-29" });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { amount: "O valor deve ser maior que zero", date: "Data inválida" },
    });
    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      { id: original.id, amountCents: 20000, date: "2026-10-15" },
    ]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 'Transação não encontrada' for an unknown id", async () => {
    expect(await updateTransaction(expense())).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("does not touch another user's transaction", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.create(owner, { id, kind: "income", amountCents: 100, date: "2026-10-01" });

    expect(await updateTransaction({ ...income(), id, amount: "999,00" })).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await transactionsRepo.listByMonth(owner, OCTOBER)).toMatchObject([
      { id, amountCents: 100 },
    ]);
  });

  it("returns UNAUTHORIZED without a session and changes nothing", async () => {
    const original = expense();
    await createTransaction(original);
    request.headers = new Headers();

    expect(await updateTransaction({ ...original, amount: "1,00" })).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      { amountCents: 20000 },
    ]);
  });

  it("returns the generic message when the database fails", async () => {
    const original = expense();
    await createTransaction(original);
    vi.spyOn(transactionsRepo, "update").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await updateTransaction(original)).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("deleteTransaction", () => {
  it("removes the transaction, updates the month totals and revalidates /", async () => {
    const salary = income();
    await createTransaction(salary);
    vi.mocked(revalidatePath).mockClear();

    expect(await deleteTransaction(salary.id)).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(0);
    expect((await transactionsRepo.monthTotals(userId, OCTOBER)).incomeCents).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("answers 'Transação não encontrada' for an unknown or malformed id", async () => {
    expect(await deleteTransaction(randomUUID())).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await deleteTransaction("nao-e-um-uuid")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
  });

  it("does not delete another user's transaction", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.create(owner, { id, kind: "income", amountCents: 100, date: "2026-10-01" });

    expect(await deleteTransaction(id)).toEqual({ ok: false, error: "Transação não encontrada" });
    expect(await db.$count(transaction)).toBe(1);
  });

  it("returns UNAUTHORIZED without a session and deletes nothing", async () => {
    const salary = income();
    await createTransaction(salary);
    request.headers = new Headers();

    expect(await deleteTransaction(salary.id)).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(await db.$count(transaction)).toBe(1);
  });

  it("returns the generic message when the database fails", async () => {
    vi.spyOn(transactionsRepo, "delete").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteTransaction(randomUUID())).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("transaction subcategory", () => {
  const SUBCATEGORY_MESSAGE = "Subcategoria não pertence à categoria";

  async function insertSubcategory(owner: string, ofCategory: string, name = "Restaurante") {
    const [row] = await db
      .insert(subcategory)
      .values({ userId: owner, categoryId: ofCategory, name })
      .returning({ id: subcategory.id });
    return row.id;
  }

  async function insertOtherCategory(name = "Lazer") {
    const [row] = await db
      .insert(category)
      .values({ userId, name, percentBp: 1, color: 2 })
      .returning({ id: category.id });
    return row.id;
  }

  const stored = async () => (await transactionsRepo.listByMonth(userId, OCTOBER))[0];

  it("creates an expense with a subcategory of its category", async () => {
    const subcategoryId = await insertSubcategory(userId, categoryId);

    expect(await createTransaction(expense({ subcategoryId }))).toEqual({ ok: true });

    expect((await stored()).subcategoryId).toBe(subcategoryId);
  });

  it.each([[undefined], [""]])("creates an expense without subcategory when it is %j", async (value) => {
    expect(await createTransaction(expense({ subcategoryId: value }))).toEqual({ ok: true });

    expect((await stored()).subcategoryId).toBeNull();
  });

  it("rejects a subcategory of another category, naming the field", async () => {
    const lazer = await insertOtherCategory();
    const foreign = await insertSubcategory(userId, lazer, "Cinema");

    expect(await createTransaction(expense({ subcategoryId: foreign }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a subcategory that does not exist", async () => {
    expect(await createTransaction(expense({ subcategoryId: randomUUID() }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("rejects a subcategory of another user", async () => {
    const otherOwner = await insertTestUser();
    const otherSubcategory = await insertSubcategory(otherOwner, await insertCategory(otherOwner));

    expect(await createTransaction(expense({ subcategoryId: otherSubcategory }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("updates the subcategory of an expense", async () => {
    const restaurante = await insertSubcategory(userId, categoryId, "Restaurante");
    const streaming = await insertSubcategory(userId, categoryId, "Streaming");
    const original = expense({ subcategoryId: restaurante });
    await createTransaction(original);

    expect(await updateTransaction({ ...original, subcategoryId: streaming })).toEqual({ ok: true });
    expect((await stored()).subcategoryId).toBe(streaming);

    expect(await updateTransaction({ ...original, subcategoryId: "" })).toEqual({ ok: true });
    expect((await stored()).subcategoryId).toBeNull();
  });

  it("rejects an update with a subcategory outside the category and keeps the expense", async () => {
    const restaurante = await insertSubcategory(userId, categoryId);
    const foreign = await insertSubcategory(userId, await insertOtherCategory(), "Cinema");
    const original = expense({ subcategoryId: restaurante });
    await createTransaction(original);

    expect(await updateTransaction({ ...original, subcategoryId: foreign })).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect((await stored()).subcategoryId).toBe(restaurante);
  });

  it("rejects an income with a subcategory and persists nothing", async () => {
    const subcategoryId = await insertSubcategory(userId, categoryId);

    // The types already forbid it; the action must still reject a tampered payload.
    const tampered = { ...income(), subcategoryId } as unknown as Parameters<
      typeof createTransaction
    >[0];

    expect(await createTransaction(tampered)).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: "Ganho não tem subcategoria" },
    });
    expect(await db.$count(transaction)).toBe(0);
  });
});
