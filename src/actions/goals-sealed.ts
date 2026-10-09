"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { logActionError } from "@/lib/log";
import { sealedGoalSchema } from "@/lib/validation/goal-sealed";
import { sealedInvalidInput } from "@/lib/validation/sealed";
import type { GoalDto } from "@/lib/vault/types";

/**
 * Saves the user's sealed financial freedom goal, replacing the previous one. The server only
 * checks that the five fields are well-formed ciphertexts; the goal rules (age, rates, income)
 * are checked in the browser before sealing.
 */
export async function saveGoalSealed(dto: GoalDto): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = sealedGoalSchema.safeParse(dto);
  if (!parsed.success) return sealedInvalidInput(parsed.error);

  try {
    await goalsRepo.upsertSealed(session.userId, parsed.data);
  } catch (error) {
    logActionError("saveGoalSealed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/liberdade");
  return { ok: true };
}
