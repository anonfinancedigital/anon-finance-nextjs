import type { z } from "zod";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { CIPHERTEXT_MESSAGE } from "./ciphertext";

/**
 * `invalidInput` for sealed DTOs: a malformed ciphertext is not something the user can fix in a
 * field (the browser produced it), so it answers the generic `SAVE_FAILED` and never echoes input.
 */
export function sealedInvalidInput(error: z.ZodError): ActionResult {
  if (error.issues.some((issue) => issue.message === CIPHERTEXT_MESSAGE)) {
    return { ok: false, error: SAVE_FAILED };
  }
  return invalidInput(error);
}
