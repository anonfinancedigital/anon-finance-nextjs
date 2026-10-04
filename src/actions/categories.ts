"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { categorySetSchema } from "@/lib/validation/category";

/** Replaces the user's whole category set (percentages must sum to 100%). */
export async function saveCategories(input: z.input<typeof categorySetSchema>): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = categorySetSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const result = await categoriesRepo.replaceSet(session.userId, parsed.data);
    if (!result.ok) return result;
  } catch (error) {
    console.error("saveCategories", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
