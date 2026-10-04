/** Return value of every Server Action. */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const UNAUTHORIZED = "UNAUTHORIZED";
