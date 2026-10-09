"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { logActionError } from "@/lib/log";
import { sealedCategorySetSchema } from "@/lib/validation/category-sealed";
import { sealedInvalidInput } from "@/lib/validation/sealed";
import type { CategorySetDto } from "@/lib/vault/types";

/**
 * Replaces the user's whole sealed category set. Only the structure is checked here (the browser
 * validates names and the 100% sum before sealing). Field errors are keyed by item index
 * ("1.color", "0.subcategories.2.nameCt"), as in the plain-text action.
 */
export async function saveCategoriesSealed(dto: CategorySetDto): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = sealedCategorySetSchema.safeParse(dto?.items);
  if (!parsed.success) return sealedInvalidInput(parsed.error);

  try {
    const result = await categoriesRepo.replaceSetSealed(session.userId, { items: parsed.data });
    if (!result.ok) return result;
  } catch (error) {
    logActionError("saveCategoriesSealed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/");
  return { ok: true };
}
