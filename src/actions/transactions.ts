"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { type TransactionInput, transactionSchema } from "@/lib/validation/transaction";

const CATEGORY_NOT_FOUND = "Categoria não encontrada";
const TRANSACTION_NOT_FOUND = "Transação não encontrada";

const categoryNotFound: ActionResult = {
  ok: false,
  error: CATEGORY_NOT_FOUND,
  fieldErrors: { categoryId: CATEGORY_NOT_FOUND },
};

async function isOwnCategory(userId: string, tx: TransactionInput): Promise<boolean> {
  if (tx.kind !== "expense") return true;
  const categories = await categoriesRepo.list(userId);
  return categories.some((c) => c.id === tx.categoryId);
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
    if (!(await isOwnCategory(session.userId, parsed.data))) return categoryNotFound;
    await transactionsRepo.create(session.userId, parsed.data);
  } catch (error) {
    console.error("createTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}

/** Replaces date, amount, kind, category and description of the user's transaction (last write wins). */
export async function updateTransaction(
  input: z.input<typeof transactionSchema>,
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    if (!(await isOwnCategory(session.userId, parsed.data))) return categoryNotFound;
    const { id, ...data } = parsed.data;
    if (!(await transactionsRepo.update(session.userId, id, data))) {
      return { ok: false, error: TRANSACTION_NOT_FOUND };
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
