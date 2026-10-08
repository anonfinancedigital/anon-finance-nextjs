"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { usersRepo } from "@/lib/db/repos/users";
import { isoToBR } from "@/lib/domain/date-br";
import { goalSchema } from "@/lib/validation/goal";

const NO_BIRTH_DATE = "Informe sua data de nascimento antes de salvar o objetivo";

/**
 * Saves the user's financial freedom goal, replacing the previous one. The birth date is the one
 * stored in the user: a `birthDate` sent by the client is ignored.
 */
export async function saveGoal(
  input: Omit<z.input<ReturnType<typeof goalSchema>>, "birthDate"> & { birthDate?: string },
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  try {
    const birthDate = await usersRepo.getBirthDate(session.userId);
    if (birthDate === null) return { ok: false, error: NO_BIRTH_DATE };

    const parsed = goalSchema(new Date()).safeParse({ ...input, birthDate: isoToBR(birthDate) });
    if (!parsed.success) return invalidInput(parsed.error);

    const { monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp } = parsed.data;
    await goalsRepo.upsert(session.userId, { monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp });
  } catch (error) {
    console.error("saveGoal", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/liberdade");
  return { ok: true };
}
