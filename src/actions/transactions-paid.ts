"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, invalidInput } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { logActionError } from "@/lib/log";

const TRANSACTION_NOT_FOUND = "Transação não encontrada";
export const PAID_FAILED = "Não foi possível atualizar o estado. Tente novamente.";

const paidSchema = z.object({
  id: z.uuid({ error: "Identificador inválido" }),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido"),
  paid: z.boolean({ error: "Estado inválido" }),
});

/** Marks the occurrence of `id` in `month` (AAAA-MM) as paid or not paid; revalidates `/`. */
export async function setOccurrencePaid(id: string, month: string, paid: boolean): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = paidSchema.safeParse({ id, month, paid });
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    if (!(await transactionsRepo.setPaid(session.userId, parsed.data.id, parsed.data.month, parsed.data.paid))) {
      return { ok: false, error: TRANSACTION_NOT_FOUND };
    }
  } catch (error) {
    logActionError("setOccurrencePaid", error);
    return { ok: false, error: PAID_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
