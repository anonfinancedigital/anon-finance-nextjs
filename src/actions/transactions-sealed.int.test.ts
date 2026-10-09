import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, categoryPercent, subcategory, transaction } from "@/lib/db/schema";
import { monthRange } from "@/lib/domain/month";
import type { TransactionDto, UpdateTransactionDto } from "@/lib/vault/types";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { createTransactionSealed, updateTransactionSealed } from "./transactions-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const range = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return monthRange({ year, month });
};

const GENERIC = "Não foi possível salvar. Tente novamente";

let userId: string;
let categoryId: string;

async function insertSealedCategory(owner: string) {
  const [row] = await db
    .insert(category)
    .values({ userId: owner, nameCt: "v1:nomecategoria", color: 1 })
    .returning({ id: category.id });
  await db
    .insert(categoryPercent)
    .values({ categoryId: row.id, fromMonth: "0001-01-01", percentCt: "v1:percent" });
  return row.id;
}

async function insertSealedSubcategory(owner: string, parent: string) {
  const [row] = await db
    .insert(subcategory)
    .values({ userId: owner, categoryId: parent, nameCt: "v1:nomesub" })
    .returning({ id: subcategory.id });
  return row.id;
}

const expense = (overrides: Partial<TransactionDto> = {}): TransactionDto => ({
  id: randomUUID(),
  kind: "expense",
  date: "2026-10-15",
  categoryId,
  subcategoryId: null,
  amountCt: "v1:valor200",
  descriptionCt: "v1:cinema",
  recurrence: "none",
  ...overrides,
});

const income = (overrides: Partial<TransactionDto> = {}): TransactionDto => ({
  id: randomUUID(),
  kind: "income",
  date: "2026-10-05",
  categoryId: null,
  subcategoryId: null,
  amountCt: "v1:salario",
  descriptionCt: "v1:descsalario",
  recurrence: "none",
  ...overrides,
});

const edit = (dto: TransactionDto, overrides: Partial<UpdateTransactionDto> = {}): UpdateTransactionDto => ({
  ...dto,
  newRowId: randomUUID(),
  insertedCt: { amountCt: "v1:novovalor", descriptionCt: "v1:novadesc" },
  ...overrides,
});

const rows = () => db.select().from(transaction);

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
  categoryId = await insertSealedCategory(userId);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createTransactionSealed", () => {
  it("stores only ciphertext (v1:) and leaves the plain-text columns NULL, then revalidates /", async () => {
    const dto = expense();

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    const [row] = await rows();
    expect(row).toMatchObject({ id: dto.id, userId, kind: "expense", date: "2026-10-15", categoryId });
    expect(row.amountCt!.startsWith("v1:")).toBe(true);
    expect(row.amountCt).toBe("v1:valor200");
    expect(row.descriptionCt).toBe("v1:cinema");
    expect(row.amountCents).toBeNull();
    expect(row.description).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("stores an income without category and a missing description as NULL", async () => {
    const dto = income({ descriptionCt: null });

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-10"))).toMatchObject([
      { id: dto.id, kind: "income", categoryId: null, amountCt: "v1:salario", descriptionCt: null },
    ]);
  });

  it("stores the subcategory of the expense's own category", async () => {
    const subcategoryId = await insertSealedSubcategory(userId, categoryId);

    expect(await createTransactionSealed(expense({ subcategoryId }))).toEqual({ ok: true });

    expect((await rows())[0].subcategoryId).toBe(subcategoryId);
  });

  it("creates a single row when the same id is sent twice", async () => {
    const dto = expense();

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });
    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(1);
  });

  it("rejects a category that does not exist", async () => {
    const result = await createTransactionSealed(expense({ categoryId: randomUUID() }));

    expect(result).toMatchObject({
      ok: false,
      error: "Categoria não encontrada",
      fieldErrors: { categoryId: "Categoria não encontrada" },
    });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a category of another user", async () => {
    const otherCategory = await insertSealedCategory(await insertTestUser());

    const result = await createTransactionSealed(expense({ categoryId: otherCategory }));

    expect(result).toMatchObject({ ok: false, fieldErrors: { categoryId: "Categoria não encontrada" } });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("rejects a subcategory that belongs to another category", async () => {
    const otherCategory = await insertSealedCategory(userId);
    const foreignSub = await insertSealedSubcategory(userId, otherCategory);

    const result = await createTransactionSealed(expense({ subcategoryId: foreignSub }));

    expect(result).toEqual({
      ok: false,
      error: "Subcategoria não pertence à categoria",
      fieldErrors: { subcategoryId: "Subcategoria não pertence à categoria" },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it.each([
    ["without the v1: prefix", "texto puro 200,00"],
    ["with the v2: prefix", "v2:abc"],
    ["longer than 2048 characters", `v1:${"a".repeat(2046)}`],
    ["empty after the prefix", "v1:"],
    ["with characters outside base64url", "v1:a b+c"],
  ])("answers SAVE_FAILED and saves nothing for an amount %s", async (_, amountCt) => {
    expect(await createTransactionSealed(expense({ amountCt }))).toEqual({ ok: false, error: GENERIC });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED and saves nothing for a malformed description", async () => {
    expect(await createTransactionSealed(expense({ descriptionCt: "Cinema" }))).toEqual({
      ok: false,
      error: GENERIC,
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("accepts a ciphertext of exactly 2048 characters", async () => {
    expect(await createTransactionSealed(expense({ amountCt: `v1:${"a".repeat(2045)}` }))).toEqual({
      ok: true,
    });
    expect((await rows())[0].amountCt).toHaveLength(2048);
  });

  it("never stores a plain-text field smuggled next to the ciphertext", async () => {
    const smuggled = { ...expense(), amount: "200,00", description: "Cinema", amountCents: 20000 };

    expect(await createTransactionSealed(smuggled as TransactionDto)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([
      { amountCents: null, description: null, amountCt: "v1:valor200" },
    ]);
  });

  it.each([
    ["id", { id: "nao-uuid" }, "id"],
    ["date", { date: "2026-02-29" }, "date"],
    ["date", { date: "" }, "date"],
    ["categoryId", { categoryId: "nao-uuid" }, "categoryId"],
    ["subcategoryId", { subcategoryId: "nao-uuid" }, "subcategoryId"],
    ["recurrence", { recurrence: "forever" }, "recurrence"],
  ])("rejects an invalid %s (%j) with a field error and saves nothing", async (_, overrides, field) => {
    const result = await createTransactionSealed(expense(overrides as Partial<TransactionDto>));

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: expect.any(String) } });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an income that carries a category", async () => {
    const result = await createTransactionSealed(income({ categoryId }));

    expect(result).toMatchObject({ ok: false, fieldErrors: { categoryId: "Ganho não tem categoria" } });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    request.headers = new Headers();
    const create = vi.spyOn(transactionsRepo, "createSealed");

    expect(await createTransactionSealed(expense())).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(create).not.toHaveBeenCalled();
    expect(await db.$count(transaction)).toBe(0);
  });

  it("returns the generic message and logs only the error code when the database fails", async () => {
    vi.spyOn(transactionsRepo, "createSealed").mockRejectedValueOnce(
      Object.assign(new Error("valor 200,00"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await createTransactionSealed(expense())).toEqual({ ok: false, error: GENERIC });
    expect(consoleError).toHaveBeenCalledWith("createTransactionSealed", "08006");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("createTransactionSealed recurrence", () => {
  it("stores a single recurring row for 'indefinite' and shows it in later months", async () => {
    const dto = expense({ recurrence: "indefinite" });

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([
      { id: dto.id, recurring: true, recurrenceDay: 15, recurrenceEnd: null, seriesId: dto.id },
    ]);
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-11"))).toMatchObject([
      { id: dto.id, date: "2026-11-15", amountCt: "v1:valor200" },
    ]);
  });

  it("stores the series from the start month with the end month for 'until'", async () => {
    const dto = expense({
      date: "2026-04-10",
      recurrence: "until",
      recurrenceStartMonth: "2026-05",
      recurrenceEndMonth: "2026-12",
    });

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([
      { id: dto.id, date: "2026-05-10", recurrenceDay: 10, recurrenceEnd: "2026-12-01" },
    ]);
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-04"))).toEqual([]);
    expect(
      (await transactionsRepo.listByMonthSealed(userId, range("2026-05"))).map((o) => o.installment),
    ).toEqual([{ number: 1, total: 8 }]);
  });

  it("ignores months sent with 'indefinite'", async () => {
    const dto = expense({
      recurrence: "indefinite",
      recurrenceStartMonth: "2026-01",
      recurrenceEndMonth: "2026-12",
    });

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([{ recurring: true, recurrenceEnd: null, date: "2026-10-15" }]);
  });

  it.each([
    ["end is missing", { recurrenceEndMonth: undefined }, "recurrenceEndMonth", "Informe o mês final"],
    ["end is invalid", { recurrenceEndMonth: "2026-13" }, "recurrenceEndMonth", "Mês final inválido"],
    [
      "end is before start",
      { recurrenceEndMonth: "2026-09" },
      "recurrenceEndMonth",
      "O mês final deve ser igual ou posterior ao mês inicial",
    ],
    ["start is missing", { recurrenceStartMonth: undefined }, "recurrenceStartMonth", "Informe o mês inicial"],
    ["start is invalid", { recurrenceStartMonth: "2026-13" }, "recurrenceStartMonth", "Mês inicial inválido"],
  ])("rejects 'until' when the %s and saves nothing", async (_, overrides, field, message) => {
    const result = await createTransactionSealed(
      expense({
        recurrence: "until",
        recurrenceStartMonth: "2026-10",
        recurrenceEndMonth: "2026-12",
        ...overrides,
      }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: message } });
    expect(await db.$count(transaction)).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTransactionSealed", () => {
  it("replaces the ciphertext, date and category and revalidates /", async () => {
    const original = expense();
    await createTransactionSealed(original);
    const other = await insertSealedCategory(userId);
    vi.mocked(revalidatePath).mockClear();

    const edited = edit({
      ...original,
      amountCt: "v1:valor350",
      descriptionCt: "v1:curso",
      date: "2026-11-02",
      categoryId: other,
    });
    expect(await updateTransactionSealed(edited)).toEqual({ ok: true });

    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-10"))).toEqual([]);
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-11"))).toMatchObject([
      { id: original.id, amountCt: "v1:valor350", descriptionCt: "v1:curso", date: "2026-11-02", categoryId: other },
    ]);
    const [row] = await rows();
    expect(row.amountCt!.startsWith("v1:")).toBe(true);
    expect(row.amountCents).toBeNull();
    expect(row.description).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("keeps the last of two edits received in sequence", async () => {
    const original = expense();
    await createTransactionSealed(original);

    await updateTransactionSealed(edit({ ...original, amountCt: "v1:dez" }));
    await updateTransactionSealed(edit({ ...original, amountCt: "v1:vinte" }));

    expect((await rows())[0].amountCt).toBe("v1:vinte");
  });

  it.each([
    ["without the v1: prefix", { amountCt: "350,50" }],
    ["with the v2: prefix", { amountCt: "v2:abc" }],
    ["longer than 2048 characters", { amountCt: `v1:${"a".repeat(2046)}` }],
    ["in the description", { descriptionCt: "Curso" }],
    [
      "in the inserted segment",
      { insertedCt: { amountCt: "texto puro", descriptionCt: null } },
    ],
  ])("answers SAVE_FAILED and keeps the row unchanged for a malformed ciphertext %s", async (_, overrides) => {
    const original = expense();
    await createTransactionSealed(original);
    vi.mocked(revalidatePath).mockClear();

    expect(await updateTransactionSealed(edit(original, overrides as Partial<UpdateTransactionDto>))).toEqual({
      ok: false,
      error: GENERIC,
    });
    expect(await rows()).toMatchObject([{ amountCt: "v1:valor200", descriptionCt: "v1:cinema" }]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid structure and keeps the row unchanged", async () => {
    const original = expense();
    await createTransactionSealed(original);

    const result = await updateTransactionSealed(
      edit({ ...original, amountCt: "v1:novo", date: "2026-02-29" }, { newRowId: "nao-uuid" }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { date: "Data inválida" } });
    expect(await rows()).toMatchObject([{ amountCt: "v1:valor200", date: "2026-10-15" }]);
  });

  it("rejects an invalid newRowId", async () => {
    const original = expense();
    await createTransactionSealed(original);

    expect(await updateTransactionSealed(edit(original, { newRowId: "nao-uuid" }))).toMatchObject({
      ok: false,
      fieldErrors: { newRowId: expect.any(String) },
    });
  });

  it("answers 'Transação não encontrada' for an unknown id", async () => {
    expect(await updateTransactionSealed(edit(expense()))).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("does not touch another user's transaction", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.createSealed(owner, income({ id, amountCt: "v1:dono" }));

    expect(await updateTransactionSealed(edit(income({ id, amountCt: "v1:invasor" })))).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await transactionsRepo.listByMonthSealed(owner, range("2026-10"))).toMatchObject([
      { id, amountCt: "v1:dono" },
    ]);
  });

  it("rejects a category of another user on edit", async () => {
    const original = expense();
    await createTransactionSealed(original);
    const otherCategory = await insertSealedCategory(await insertTestUser());

    expect(await updateTransactionSealed(edit({ ...original, categoryId: otherCategory }))).toMatchObject({
      ok: false,
      fieldErrors: { categoryId: "Categoria não encontrada" },
    });
    expect((await rows())[0].categoryId).toBe(categoryId);
  });

  it("rejects a subcategory outside the category on edit", async () => {
    const original = expense();
    await createTransactionSealed(original);
    const foreignSub = await insertSealedSubcategory(userId, await insertSealedCategory(userId));

    expect(await updateTransactionSealed(edit({ ...original, subcategoryId: foreignSub }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: "Subcategoria não pertence à categoria" },
    });
  });

  it("returns UNAUTHORIZED without a session and changes nothing", async () => {
    const original = expense();
    await createTransactionSealed(original);
    request.headers = new Headers();

    expect(await updateTransactionSealed(edit({ ...original, amountCt: "v1:invasor" }))).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });
    expect((await rows())[0].amountCt).toBe("v1:valor200");
  });

  it("returns the generic message and logs only the code when the database fails", async () => {
    const original = expense();
    await createTransactionSealed(original);
    vi.spyOn(transactionsRepo, "updateFromSealed").mockRejectedValueOnce(
      Object.assign(new Error("valor 200,00"), { code: "57P01" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await updateTransactionSealed(edit(original))).toEqual({ ok: false, error: GENERIC });
    expect(consoleError).toHaveBeenCalledWith("updateTransactionSealed", "57P01");
  });

  it("rolls the whole edit back and answers SAVE_FAILED when newRowId already exists", async () => {
    const original = expense({ recurrence: "indefinite" });
    await createTransactionSealed(original);
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Editing a later month splits the series; the new segment would take an id already in use.
    const result = await updateTransactionSealed(
      edit({ ...original, date: "2026-12-15", amountCt: "v1:novo" }, { newRowId: original.id }),
      "2026-12",
    );

    expect(result).toEqual({ ok: false, error: GENERIC });
    expect(await rows()).toMatchObject([{ id: original.id, amountCt: "v1:valor200", recurrenceEnd: null }]);
  });
});

describe("updateTransactionSealed from a month", () => {
  const amountsIn = async (key: string) =>
    (await transactionsRepo.listByMonthSealed(userId, range(key))).map((o) => o.amountCt);
  const created = async () => {
    const original = expense({ amountCt: "v1:cem", recurrence: "indefinite" });
    await createTransactionSealed(original);
    return original;
  };

  it("changes the edited month onward, inserting the new segment with the client's id", async () => {
    const original = await created();
    const newRowId = randomUUID();

    const result = await updateTransactionSealed(
      edit({ ...original, amountCt: "v1:naoUsado", date: "2026-12-15" }, {
        newRowId,
        insertedCt: { amountCt: "v1:cento20", descriptionCt: "v1:novadesc" },
      }),
      "2026-12",
    );

    expect(result).toEqual({ ok: true });
    expect(await amountsIn("2026-10")).toEqual(["v1:cem"]);
    expect(await amountsIn("2026-11")).toEqual(["v1:cem"]);
    expect(await amountsIn("2026-12")).toEqual(["v1:cento20"]);
    expect(await amountsIn("2027-01")).toEqual(["v1:cento20"]);
    const inserted = (await rows()).find((r) => r.id === newRowId)!;
    expect(inserted).toMatchObject({ amountCt: "v1:cento20", amountCents: null, description: null });
  });

  it("rejects a date outside the occurrence month of a recurring row and changes nothing", async () => {
    const original = await created();
    vi.mocked(revalidatePath).mockClear();

    const result = await updateTransactionSealed(edit({ ...original, date: "2027-01-15" }), "2026-12");

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { date: "A data deve estar no mês da ocorrência" },
    });
    expect(await db.$count(transaction)).toBe(1);
    expect(await amountsIn("2026-12")).toEqual(["v1:cem"]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("turns the edited month into a single non-recurring row when set to 'none'", async () => {
    const original = await created();

    const result = await updateTransactionSealed(
      edit({ ...original, amountCt: "v1:cento30", date: "2026-12-15", recurrence: "none" }, {
        insertedCt: { amountCt: "v1:cento30", descriptionCt: null },
      }),
      "2026-12",
    );

    expect(result).toEqual({ ok: true });
    expect(await amountsIn("2026-11")).toEqual(["v1:cem"]);
    expect(await amountsIn("2026-12")).toEqual(["v1:cento30"]);
    expect(await amountsIn("2027-01")).toEqual([]);
  });

  it("keeps the free date change of a non-recurring row when month is omitted", async () => {
    const original = expense();
    await createTransactionSealed(original);

    expect(await updateTransactionSealed(edit({ ...original, date: "2026-11-02" }))).toEqual({ ok: true });

    expect(await amountsIn("2026-10")).toEqual([]);
    expect(await amountsIn("2026-11")).toEqual(["v1:valor200"]);
  });

  it.each([
    ["malformed month", "2026-13", "2026-10-15", true],
    ["month out of the segment's range", "2026-09", "2026-09-15", true],
    ["unknown id with a valid month", "2026-10", "2026-10-15", false],
  ])("answers 'Transação não encontrada' for %s", async (_, month, date, existing) => {
    const original = await created();
    const input = existing ? original : expense({ recurrence: "indefinite" });

    expect(await updateTransactionSealed(edit({ ...input, date }), month)).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await amountsIn("2026-10")).toEqual(["v1:cem"]);
  });

  it("answers 'Transação não encontrada' for another user's row", async () => {
    const owner = await insertTestUser();
    const id = randomUUID();
    await transactionsRepo.createSealed(owner, income({ id, recurrence: "indefinite", amountCt: "v1:dono" }));

    expect(await updateTransactionSealed(edit(income({ id })), "2026-10")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await transactionsRepo.listByMonthSealed(owner, range("2026-10"))).toMatchObject([
      { amountCt: "v1:dono" },
    ]);
  });

  it("keeps answering 'Categoria não encontrada' for another user's category", async () => {
    const original = await created();
    const otherCategory = await insertSealedCategory(await insertTestUser());

    expect(
      await updateTransactionSealed(edit({ ...original, categoryId: otherCategory, date: "2026-12-15" }), "2026-12"),
    ).toMatchObject({ ok: false, fieldErrors: { categoryId: "Categoria não encontrada" } });
    expect(await amountsIn("2026-12")).toEqual(["v1:cem"]);
  });
});

describe("updateTransactionSealed start month and end month", () => {
  const created = async () => {
    const original = expense({
      date: "2026-04-10",
      amountCt: "v1:cem",
      recurrence: "until",
      recurrenceStartMonth: "2026-04",
      recurrenceEndMonth: "2026-12",
    });
    await createTransactionSealed(original);
    return original;
  };

  it("moves the start when editing the first month of the series", async () => {
    const original = await created();

    const result = await updateTransactionSealed(edit({ ...original, recurrenceStartMonth: "2026-06" }), "2026-04");

    expect(result).toEqual({ ok: true });
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-05"))).toEqual([]);
    expect(
      (await transactionsRepo.listByMonthSealed(userId, range("2026-06"))).map((o) => o.date),
    ).toEqual(["2026-06-10"]);
  });

  it("rejects a final month before the start month and changes nothing", async () => {
    const original = await created();
    vi.mocked(revalidatePath).mockClear();

    const result = await updateTransactionSealed(
      edit({ ...original, recurrenceStartMonth: "2026-06", recurrenceEndMonth: "2026-05" }),
      "2026-04",
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { recurrenceEndMonth: "O mês final deve ser igual ou posterior ao mês inicial" },
    });
    expect(await rows()).toMatchObject([{ date: "2026-04-10", recurrenceEnd: "2026-12-01" }]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a final month before the edited month when editing in the middle of the series", async () => {
    const original = await created();

    const result = await updateTransactionSealed(
      edit({ ...original, date: "2026-08-10", recurrenceStartMonth: "2026-04", recurrenceEndMonth: "2026-07" }),
      "2026-08",
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { recurrenceEndMonth: "O mês final deve ser igual ou posterior ao mês inicial" },
    });
    expect(await db.$count(transaction)).toBe(1);
  });

  it("accepts a final month equal to the edited month in the middle and ignores the start sent", async () => {
    const original = await created();

    const result = await updateTransactionSealed(
      edit({ ...original, date: "2026-08-10", recurrenceStartMonth: "2026-02", recurrenceEndMonth: "2026-08" }),
      "2026-08",
    );

    expect(result).toEqual({ ok: true });
    expect((await rows()).map((r) => [r.date, r.recurrenceEnd]).sort()).toEqual([
      ["2026-04-10", "2026-07-01"],
      ["2026-08-10", "2026-08-01"],
    ]);
  });
});

describe("createTransactionSealed recurring income", () => {
  it("stores a recurring income that shows in later months", async () => {
    const dto = income({ recurrence: "indefinite" });

    expect(await createTransactionSealed(dto)).toEqual({ ok: true });

    expect(await rows()).toMatchObject([{ id: dto.id, kind: "income", recurring: true }]);
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-11"))).toMatchObject([
      { id: dto.id, kind: "income", date: "2026-11-05", amountCt: "v1:salario" },
    ]);
  });
});

describe("transaction subcategory (sealed)", () => {
  const SUBCATEGORY_MESSAGE = "Subcategoria não pertence à categoria";

  it("stores an expense without subcategory as NULL", async () => {
    expect(await createTransactionSealed(expense({ subcategoryId: null }))).toEqual({ ok: true });

    expect((await rows())[0].subcategoryId).toBeNull();
  });

  it("rejects a subcategory that does not exist, naming the field", async () => {
    expect(await createTransactionSealed(expense({ subcategoryId: randomUUID() }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("rejects a subcategory of another user", async () => {
    const otherOwner = await insertTestUser();
    const otherSubcategory = await insertSealedSubcategory(otherOwner, await insertSealedCategory(otherOwner));

    expect(await createTransactionSealed(expense({ subcategoryId: otherSubcategory }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect(await db.$count(transaction)).toBe(0);
  });

  it("updates the subcategory of an expense and clears it with null", async () => {
    const restaurante = await insertSealedSubcategory(userId, categoryId);
    const streaming = await insertSealedSubcategory(userId, categoryId);
    const original = expense({ subcategoryId: restaurante });
    await createTransactionSealed(original);

    expect(await updateTransactionSealed(edit({ ...original, subcategoryId: streaming }))).toEqual({ ok: true });
    expect((await rows())[0].subcategoryId).toBe(streaming);

    expect(await updateTransactionSealed(edit({ ...original, subcategoryId: null }))).toEqual({ ok: true });
    expect((await rows())[0].subcategoryId).toBeNull();
  });

  it("rejects an update with a subcategory outside the category and keeps the expense", async () => {
    const restaurante = await insertSealedSubcategory(userId, categoryId);
    const foreign = await insertSealedSubcategory(userId, await insertSealedCategory(userId));
    const original = expense({ subcategoryId: restaurante });
    await createTransactionSealed(original);

    expect(await updateTransactionSealed(edit({ ...original, subcategoryId: foreign }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: SUBCATEGORY_MESSAGE },
    });
    expect((await rows())[0].subcategoryId).toBe(restaurante);
  });

  it("rejects an income with a subcategory and persists nothing", async () => {
    const subcategoryId = await insertSealedSubcategory(userId, categoryId);

    expect(await createTransactionSealed(income({ subcategoryId }))).toMatchObject({
      ok: false,
      fieldErrors: { subcategoryId: "Ganho não tem subcategoria" },
    });
    expect(await db.$count(transaction)).toBe(0);
  });
});
