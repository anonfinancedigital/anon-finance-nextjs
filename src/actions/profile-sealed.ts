"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { vaultRepo } from "@/lib/db/repos/vault";
import { logActionError } from "@/lib/log";
import { ciphertextSchema } from "@/lib/validation/ciphertext";
import type { Ct } from "@/lib/vault/types";

/**
 * Saves the session user's sealed birth date. The server only checks the ciphertext format; the
 * age rules (valid date, age versus the goal's retirement age) are applied in the browser.
 * An account without a vault (legacy) has nowhere to keep it: answers `SAVE_FAILED`, writes nothing.
 */
export async function saveBirthDateSealed(ct: Ct): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = ciphertextSchema.safeParse(ct);
  if (!parsed.success) return { ok: false, error: SAVE_FAILED };

  try {
    if (!(await vaultRepo.get(session.userId))) return { ok: false, error: SAVE_FAILED };
    await vaultRepo.setBirthDateSealed(session.userId, parsed.data);
  } catch (error) {
    logActionError("saveBirthDateSealed", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/liberdade");
  return { ok: true };
}
