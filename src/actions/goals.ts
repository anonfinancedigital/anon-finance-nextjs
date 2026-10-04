"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { goalSchema } from "@/lib/validation/goal";

/** Saves the user's financial freedom goal, replacing the previous one. */
export async function saveGoal(input: z.input<ReturnType<typeof goalSchema>>): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = goalSchema(new Date()).safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await goalsRepo.upsert(session.userId, parsed.data);
  } catch (error) {
    console.error("saveGoal", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/liberdade");
  return { ok: true };
}
