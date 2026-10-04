import type { z } from "zod";

/** Return value of every Server Action. */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const UNAUTHORIZED = "UNAUTHORIZED";

/** Shown when the database fails or something unexpected happens while saving. */
export const SAVE_FAILED = "Não foi possível salvar. Tente novamente";

/** Maps Zod issues to `fieldErrors` keyed by path ("0.percent", "amount"); set-level issues become `error`. */
export function invalidInput(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  let root: string | undefined;
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key === "") root ??= issue.message;
    else fieldErrors[key] ??= issue.message;
  }
  return { ok: false, error: root ?? Object.values(fieldErrors)[0], fieldErrors };
}
