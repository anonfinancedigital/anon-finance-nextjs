"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { currentMonth } from "@/lib/domain/month";
import { monthKey } from "@/lib/domain/recurrence";
import { logActionError } from "@/lib/log";
import { sealedInvalidInput } from "@/lib/validation/sealed";
import {
  sealedTransactionSchema,
  sealedTransactionUpdateExtraSchema,
} from "@/lib/validation/transaction-sealed";
import type { TransactionDto, UpdateTransactionDto } from "@/lib/vault/types";

const CATEGORY_NOT_FOUND = "Categoria não encontrada";
const SUBCATEGORY_OUTSIDE_CATEGORY = "Subcategoria não pertence à categoria";
const TRANSACTION_NOT_FOUND = "Transação não encontrada";
const DATE_OUTSIDE_MONTH = "A data deve estar no mês da ocorrência";
const END_BEFORE_START = "O mês final deve ser igual ou posterior ao mês inicial";

const categoryNotFound: ActionResult = {
  ok: false,
  error: CATEGORY_NOT_FOUND,
  fieldErrors: { categoryId: CATEGORY_NOT_FOUND },
};

const subcategoryOutsideCategory: ActionResult = {
  ok: false,
  error: SUBCATEGORY_OUTSIDE_CATEGORY,
  fieldErrors: { subcategoryId: SUBCATEGORY_OUTSIDE_CATEGORY },
};

const transactionNotFound: ActionResult = { ok: false, error: TRANSACTION_NOT_FOUND };

const isMonthKey = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** An expense's category must be the user's and its subcategory, if any, one of that category's. */
async function checkOwnership(
  userId: string,
  dto: Pick<TransactionDto, "kind" | "categoryId" | "subcategoryId">,
): Promise<ActionResult | null> {
  if (dto.kind !== "expense") return null;
  // Same universe as the plain-text action: the categories in force this month.
  const categories = await categoriesRepo.listForMonthSealed(userId, currentMonth(new Date()));
  const own = categories.find((c) => c.id === dto.categoryId);
  if (!own) return categoryNotFound;
  if (dto.subcategoryId && !own.subcategories.some((s) => s.id === dto.subcategoryId)) {
    return subcategoryOutsideCategory;
  }
  return null;
}

/** Creates a sealed income or expense; a repeated `id` (double submit) is ignored. */
export async function createTransactionSealed(dto: TransactionDto): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = sealedTransactionSchema.safeParse(dto);
  if (!parsed.success) return sealedInvalidInput(parsed.error);

  try {
    const rejected = await checkOwnership(session.userId, parsed.data);
    if (rejected) return rejected;
    await transactionsRepo.createSealed(session.userId, parsed.data);
  } catch (error) {
    logActionError("createTransactionSealed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Replaces the user's sealed transaction from `month` (AAAA-MM of the occurrence; omitted = month
 * of the stored date) onward. The browser sends the ciphertext for the edited row and, for a split
 * series, the id and ciphertext of the new segment.
 */
export async function updateTransactionSealed(
  dto: UpdateTransactionDto,
  month?: string,
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = sealedTransactionSchema.safeParse(dto);
  if (!parsed.success) return sealedInvalidInput(parsed.error);
  const extra = sealedTransactionUpdateExtraSchema.safeParse(dto);
  if (!extra.success) return sealedInvalidInput(extra.error);
  if (month !== undefined && !isMonthKey(month)) return transactionNotFound;

  try {
    const rejected = await checkOwnership(session.userId, parsed.data);
    if (rejected) return rejected;
    const data = parsed.data;
    const stored = await transactionsRepo.findStored(session.userId, data.id);
    if (!stored) return transactionNotFound;
    const occurrenceMonth = month ?? monthKey(stored.date);
    if (stored.recurring && monthKey(data.date) !== occurrenceMonth) {
      return { ok: false, error: DATE_OUTSIDE_MONTH, fieldErrors: { date: DATE_OUTSIDE_MONTH } };
    }
    // The start month only applies when editing the series' first month; later, the edit starts
    // a new segment in the occurrence's month.
    const startMonth =
      stored.seriesStart === null || stored.seriesStart === occurrenceMonth
        ? data.recurrenceStartMonth
        : occurrenceMonth;
    if (data.recurrenceEndMonth && startMonth && data.recurrenceEndMonth < startMonth) {
      return {
        ok: false,
        error: END_BEFORE_START,
        fieldErrors: { recurrenceEndMonth: END_BEFORE_START },
      };
    }
    if (
      !(await transactionsRepo.updateFromSealed(session.userId, data.id, occurrenceMonth, {
        ...data,
        ...extra.data,
      }))
    ) {
      return transactionNotFound;
    }
  } catch (error) {
    logActionError("updateTransactionSealed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
