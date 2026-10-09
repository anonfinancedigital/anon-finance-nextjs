"use server";

import { type ActionResult, SAVE_FAILED, UNAUTHORIZED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { exportRowsSealed } from "@/lib/db/repos/export";
import { logActionError } from "@/lib/log";
import type { ExportPayload } from "@/lib/vault/types";

/** Every sealed row of the session user (SIGILO-37); without an approved session nothing is read. */
export async function exportDataAction(): Promise<
  { ok: true; data: ExportPayload } | Extract<ActionResult, { ok: false }>
> {
  const session = await requireSessionForAction();
  if (!session.ok) return { ok: false, error: UNAUTHORIZED };

  try {
    return { ok: true, data: await exportRowsSealed(session.userId) };
  } catch (error) {
    logActionError("exportDataAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}
