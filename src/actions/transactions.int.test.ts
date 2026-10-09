import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, categoryPercent, transaction } from "@/lib/db/schema";
import { monthRange } from "@/lib/domain/month";
import type { TransactionDto } from "@/lib/vault/types";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { deleteTransaction } from "./transactions";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const range = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return monthRange({ year, month });
};

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

const seed = (dto: TransactionDto, owner = userId) => transactionsRepo.createSealed(owner, dto);

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

describe("deleteTransaction", () => {
  it("removes the transaction, empties the month and revalidates /", async () => {
    const salary = income();
    await seed(salary);
    vi.mocked(revalidatePath).mockClear();

    expect(await deleteTransaction(salary.id)).toEqual({ ok: true });

    expect(await db.$count(transaction)).toBe(0);
    expect(await transactionsRepo.listByMonthSealed(userId, range("2026-10"))).toEqual([]);
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
    await seed(income({ id }), owner);

    expect(await deleteTransaction(id)).toEqual({ ok: false, error: "Transação não encontrada" });
    expect(await db.$count(transaction)).toBe(1);
  });

  it("returns UNAUTHORIZED without a session and deletes nothing", async () => {
    const salary = income();
    await seed(salary);
    request.headers = new Headers();

    expect(await deleteTransaction(salary.id)).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(await db.$count(transaction)).toBe(1);
  });

  it("returns the generic message when the database fails", async () => {
    const salary = income();
    await seed(salary);
    vi.spyOn(transactionsRepo, "deleteFrom").mockRejectedValueOnce(
      Object.assign(new Error("connection refused"), { code: "08006" }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteTransaction(salary.id)).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });
    expect(consoleError.mock.calls).toEqual([["deleteTransaction", "08006"]]);
  });
});

describe("deleteTransaction from a month", () => {
  const count = async (key: string) =>
    (await transactionsRepo.listByMonthSealed(userId, range(key))).length;
  const created = async () => {
    const original = income();
    await seed({ ...original, recurrence: "indefinite" });
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
    await seed(single);

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
    await seed(income({ id, recurrence: "indefinite" }), owner);

    expect(await deleteTransaction(id, "2026-10")).toEqual({
      ok: false,
      error: "Transação não encontrada",
    });
    expect(await db.$count(transaction)).toBe(1);
  });
});
