import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { subcategory, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { insertCategory as insertCategoryRow, insertTestUser, setupTestDb } from "@/test/db";
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
  const row = await insertCategoryRow(owner, { name: "Conforto", percentMicro: 100000000, color: 1 });
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
    ["description", { description: "" }, "Informe a descrição"],
    ["description", { description: "   " }, "Informe a descrição"],
  ])("rejects an invalid %s (%j) with a field error", async (field, overrides, message) => {
    const result = await createTransaction(expense(overrides));

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: message } });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an income without a description and saves nothing", async () => {
    const result = await createTransaction({ ...income(), description: "" });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { description: "Informe a descrição" },
    });
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

describe("createTransaction recurrence", () => {
  const rows = () => db.select().from(transaction);
  const NOVEMBER = { start: "2026-11-01", endExclusive: "2026-12-01" };

  it("stores a single recurring row for 'Sempre' without end and shows it in later months", async () => {
    const input = expense({ recurrence: "forever" });

    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([
      { id: input.id, recurring: true, recurrenceDay: 15, recurrenceEnd: null, seriesId: input.id },
    ]);
    expect(await transactionsRepo.listByMonth(userId, NOVEMBER)).toMatchObject([
      { id: input.id, date: "2026-11-15", amountCents: 20000 },
    ]);
  });

  it("stores a single recurring row for 'Até mês/ano' with the end month", async () => {
    const input = expense({ recurrence: "until", recurrenceStart: "2026-10", recurrenceEnd: "2026-12" });

    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([
      { id: input.id, recurring: true, recurrenceEnd: "2026-12-01" },
    ]);
  });

  it("stores a recurring income that counts in later months", async () => {
    const input = { ...income(), recurrence: "forever" as const };

    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([{ id: input.id, kind: "income", recurring: true }]);
    expect((await transactionsRepo.monthTotals(userId, NOVEMBER)).incomeCents).toBe(500000);
  });

  it.each([
    ["is missing", { recurrenceEnd: undefined }, "Informe o mês final"],
    [
      "is before the start month",
      { recurrenceEnd: "2026-09" },
      "O mês final deve ser igual ou posterior ao mês inicial",
    ],
    ["is invalid", { recurrenceEnd: "2026-13" }, "Mês final inválido"],
  ])("rejects 'Até mês/ano' when the end month %s and saves nothing", async (_, overrides, message) => {
    const result = await createTransaction(
      expense({ recurrence: "until", recurrenceStart: "2026-10", ...overrides }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { recurrenceEnd: message } });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores an end month sent with 'Sempre'", async () => {
    const input = expense({ recurrence: "forever", recurrenceEnd: "2026-12" });

    expect(await createTransaction(input)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([{ id: input.id, recurring: true, recurrenceEnd: null }]);
  });
});

describe("updateTransaction", () => {
  it("updates date, amount, category and description and revalidates /", async () => {
    const original = expense();
    await createTransaction(original);
    const other = await insertCategoryRow(userId, { name: "Metas", percentMicro: 10000, color: 1 });
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

  it("rejects an empty description and keeps the saved one", async () => {
    const original = expense();
    await createTransaction(original);
    vi.mocked(revalidatePath).mockClear();

    const result = await updateTransaction({ ...original, description: "  " });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { description: "Informe a descrição" },
    });
    expect(await transactionsRepo.listByMonth(userId, OCTOBER)).toMatchObject([
      { id: original.id, description: "Cinema" },
    ]);
    expect(revalidatePath).not.toHaveBeenCalled();
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
    vi.spyOn(transactionsRepo, "updateFrom").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await updateTransaction(original)).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("updateTransaction from a month", () => {
  const range = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    return { start: `${key}-01`, endExclusive: `${next}-01` };
  };
  const amountIn = async (key: string) =>
    (await transactionsRepo.listByMonth(userId, range(key))).map((o) => o.amountCents);
  const created = async () => {
    const original = expense({ amount: "100,00", recurrence: "forever" });
    await createTransaction(original);
    return original;
  };

  it("changes the edited month onward and keeps the earlier months", async () => {
    const original = await created();

    const result = await updateTransaction(
      { ...original, amount: "120,00", date: "2026-12-15" },
      "2026-12",
    );

    expect(result).toEqual({ ok: true });
    expect(await amountIn("2026-10")).toEqual([10000]);
    expect(await amountIn("2026-11")).toEqual([10000]);
    expect(await amountIn("2026-12")).toEqual([12000]);
    expect(await amountIn("2027-01")).toEqual([12000]);
  });

  it("rejects a date outside the occurrence month of a recurring row and changes nothing", async () => {
    const original = await created();
    vi.mocked(revalidatePath).mockClear();

    const result = await updateTransaction(
      { ...original, amount: "120,00", date: "2027-01-15" },
      "2026-12",
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { date: "A data deve estar no mês da ocorrência" },
    });
    expect(await db.$count(transaction)).toBe(1);
    expect(await amountIn("2026-12")).toEqual([10000]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("turns the edited month into a single non-recurring row when set to 'Não recorrente'", async () => {
    const original = await created();

    const result = await updateTransaction(
      { ...original, amount: "130,00", date: "2026-12-15", recurrence: "none" },
      "2026-12",
    );

    expect(result).toEqual({ ok: true });
    expect(await amountIn("2026-11")).toEqual([10000]);
    expect(await amountIn("2026-12")).toEqual([13000]);
    expect(await amountIn("2027-01")).toEqual([]);
  });

  it("keeps the free date change of a non-recurring row when month is omitted", async () => {
    const original = expense();
    await createTransaction(original);

    expect(await updateTransaction({ ...original, date: "2026-11-02" })).toEqual({ ok: true });

    expect(await amountIn("2026-10")).toEqual([]);
    expect(await amountIn("2026-11")).toEqual([20000]);
  });

  it.each([
    ["malformed month", "2026-13", "2026-10-15", true],
    ["month out of the segment's range", "2026-09", "2026-09-15", true],
    ["unknown id with a valid month", "2026-10", "2026-10-15", false],
  ])("answers 'Transação não encontrada' for %s", async (_, month, date, existing) => {
    const original = await created();
    const input = existing ? original : expense({ recurrence: "forever" });

    expect(await updateTransaction({ ...input, date }, month)).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await amountIn("2026-10")).toEqual([10000]);
  });

  it("answers 'Transação não encontrada' for another user's row", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.create(owner, {
      id,
      kind: "income",
      amountCents: 100,
      date: "2026-10-01",
      recurrence: "forever",
    });

    expect(await updateTransaction({ ...income(), id, amount: "999,00" }, "2026-10")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await transactionsRepo.listByMonth(owner, OCTOBER)).toMatchObject([{ amountCents: 100 }]);
  });

  it("keeps answering 'Categoria não encontrada' for another user's category", async () => {
    const original = await created();
    const otherCategory = await insertCategory(await insertTestUser());

    expect(
      await updateTransaction({ ...original, categoryId: otherCategory, date: "2026-12-15" }, "2026-12"),
    ).toMatchObject({ ok: false, fieldErrors: { categoryId: "Categoria não encontrada" } });
    expect(await amountIn("2026-12")).toEqual([10000]);
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
    const salary = income();
    await createTransaction(salary);
    vi.spyOn(transactionsRepo, "deleteFrom").mockRejectedValueOnce(new Error("connection refused"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteTransaction(salary.id)).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("deleteTransaction from a month", () => {
  const range = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    return { start: `${key}-01`, endExclusive: `${next}-01` };
  };
  const count = async (key: string) =>
    (await transactionsRepo.listByMonth(userId, range(key))).length;
  const created = async () => {
    const original = income();
    await createTransaction({ ...original, recurrence: "forever" });
    return original;
  };

  it("removes the edited month onward and keeps the earlier months", async () => {
    const salary = await created();

    expect(await deleteTransaction(salary.id, "2026-12")).toEqual({ ok: true });

    expect(await count("2026-10")).toBe(1);
    expect(await count("2026-11")).toBe(1);
    expect(await count("2026-12")).toBe(0);
    expect(await count("2027-01")).toBe(0);
  });

  it("removes everything when deleting in the start month", async () => {
    const salary = await created();

    expect(await deleteTransaction(salary.id, "2026-10")).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(0);
  });

  it("still deletes a non-recurring transaction without month", async () => {
    const single = expense();
    await createTransaction(single);

    expect(await deleteTransaction(single.id)).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(0);
  });

  it("answers 'Transação não encontrada' for a malformed month and keeps the rows", async () => {
    const salary = await created();

    expect(await deleteTransaction(salary.id, "2026-13")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await count("2026-12")).toBe(1);
  });

  it("answers 'Transação não encontrada' for another user's row", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.create(owner, {
      id,
      kind: "income",
      amountCents: 100,
      date: "2026-10-01",
      recurrence: "forever",
    });

    expect(await deleteTransaction(id, "2026-10")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await db.$count(transaction)).toBe(1);
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
    const row = await insertCategoryRow(userId, { name, percentMicro: 10000, color: 2 });
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
