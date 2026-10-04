"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { monthKey } from "@/lib/domain/recurrence";
import { type TransactionInput, transactionSchema } from "@/lib/validation/transaction";

const CATEGORY_NOT_FOUND = "Categoria não encontrada";
const TRANSACTION_NOT_FOUND = "Transação não encontrada";

const categoryNotFound: ActionResult = {
  ok: false,
  error: CATEGORY_NOT_FOUND,
  fieldErrors: { categoryId: CATEGORY_NOT_FOUND },
};

const SUBCATEGORY_OUTSIDE_CATEGORY = "Subcategoria não pertence à categoria";

const subcategoryOutsideCategory: ActionResult = {
  ok: false,
  error: SUBCATEGORY_OUTSIDE_CATEGORY,
  fieldErrors: { subcategoryId: SUBCATEGORY_OUTSIDE_CATEGORY },
};

/** An expense's category must be the user's and its subcategory, if any, one of that category's. */
async function checkOwnership(userId: string, tx: TransactionInput): Promise<ActionResult | null> {
  if (tx.kind !== "expense") return null;
  const categories = await categoriesRepo.list(userId);
  const own = categories.find((c) => c.id === tx.categoryId);
  if (!own) return categoryNotFound;
  if (tx.subcategoryId && !own.subcategories.some((s) => s.id === tx.subcategoryId)) {
    return subcategoryOutsideCategory;
  }
  return null;
}

/** Creates an income or expense; a repeated `id` (double submit) is ignored. */
export async function createTransaction(
  input: z.input<typeof transactionSchema>,
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const rejected = await checkOwnership(session.userId, parsed.data);
    if (rejected) return rejected;
    await transactionsRepo.create(session.userId, parsed.data);
  } catch (error) {
    console.error("createTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}

const isMonthKey = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const transactionNotFound: ActionResult = { ok: false, error: TRANSACTION_NOT_FOUND };

const DATE_OUTSIDE_MONTH = "A data deve estar no mês da ocorrência";

/**
 * Replaces date, amount, kind, category, subcategory, description and recurrence of the user's
 * transaction from `month` (AAAA-MM of the occurrence; omitted = month of the stored date) onward.
 */
export async function updateTransaction(
  input: z.input<typeof transactionSchema>,
  month?: string,
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  if (month !== undefined && !isMonthKey(month)) return transactionNotFound;

  try {
    const rejected = await checkOwnership(session.userId, parsed.data);
    if (rejected) return rejected;
    const { id, ...data } = parsed.data;
    const stored = await transactionsRepo.findStored(session.userId, id);
    if (!stored) return transactionNotFound;
    const occurrenceMonth = month ?? monthKey(stored.date);
    if (stored.recurring && monthKey(data.date) !== occurrenceMonth) {
      return { ok: false, error: DATE_OUTSIDE_MONTH, fieldErrors: { date: DATE_OUTSIDE_MONTH } };
    }
    if (!(await transactionsRepo.updateFrom(session.userId, id, occurrenceMonth, data))) {
      return transactionNotFound;
    }
  } catch (error) {
    console.error("updateTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  if (!z.uuid().safeParse(id).success) return { ok: false, error: TRANSACTION_NOT_FOUND };

  try {
    if (!(await transactionsRepo.delete(session.userId, id))) {
      return { ok: false, error: TRANSACTION_NOT_FOUND };
    }
  } catch (error) {
    console.error("deleteTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
