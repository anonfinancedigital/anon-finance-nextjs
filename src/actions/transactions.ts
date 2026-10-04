"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { type TransactionInput, transactionSchema } from "@/lib/validation/transaction";

const CATEGORY_NOT_FOUND = "Categoria não encontrada";

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
    if (!(await isOwnCategory(session.userId, parsed.data))) {
      return {
        ok: false,
        error: CATEGORY_NOT_FOUND,
        fieldErrors: { categoryId: CATEGORY_NOT_FOUND },
      };
    }
    await transactionsRepo.create(session.userId, parsed.data);
  } catch (error) {
    console.error("createTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
