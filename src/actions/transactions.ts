"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { monthKey } from "@/lib/domain/recurrence";
import { logActionError } from "@/lib/log";

const TRANSACTION_NOT_FOUND = "Transação não encontrada";

const isMonthKey = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const transactionNotFound: ActionResult = { ok: false, error: TRANSACTION_NOT_FOUND };

/** Deletes the occurrence of `month` (omitted = month of the stored date) and every later one. */
export async function deleteTransaction(id: string, month?: string): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  if (!z.uuid().safeParse(id).success) return transactionNotFound;
  if (month !== undefined && !isMonthKey(month)) return transactionNotFound;

  try {
    const stored = await transactionsRepo.findStored(session.userId, id);
    if (!stored) return transactionNotFound;
    const occurrenceMonth = month ?? monthKey(stored.date);
    if (!(await transactionsRepo.deleteFrom(session.userId, id, occurrenceMonth))) {
      return transactionNotFound;
    }
  } catch (error) {
    logActionError("deleteTransaction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
