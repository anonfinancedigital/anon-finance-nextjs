"use server";

import { revalidatePath } from "next/cache";
import { SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { importRepo } from "@/lib/db/repos/import";
import { logActionError } from "@/lib/log";
import { sealedImportSchema } from "@/lib/validation/import-sealed";
import { IMPORT_NOT_EMPTY } from "@/lib/vault/import-file";
import type { ImportPayload } from "@/lib/vault/types";

type ImportDataResult =
  | { ok: true; transactions: number; categories: number }
  | { ok: false; error: string };

/**
 * Writes an import sealed in the browser into the session user's account (IMPORT-04, IMPORT-19). Only
 * the structure is checked here; an account that already has transactions or categories is refused
 * under a lock in the same database transaction (IMPORT-15 to IMPORT-17). Anything else fails as a
 * whole with `SAVE_FAILED`.
 */
export async function importDataAction(payload: ImportPayload): Promise<ImportDataResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = sealedImportSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: SAVE_FAILED };

  try {
    const result = await importRepo.importSealed(session.userId, parsed.data);
    if (!result.ok) return { ok: false, error: IMPORT_NOT_EMPTY };
    revalidatePath("/");
    return result;
  } catch (error) {
    logActionError("importDataAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}
