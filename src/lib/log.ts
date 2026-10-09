/**
 * Logs a failed Server Action without leaking data: only the action name and the error `code`
 * (a string, e.g. a Postgres SQLSTATE) are recorded. The error object itself, its message,
 * `detail` and any other property never reach the log.
 */
export function logActionError(action: string, error: unknown): void {
  let code = "unknown";
  if (typeof error === "object" && error !== null && "code" in error) {
    const value = (error as { code: unknown }).code;
    if (typeof value === "string") code = value;
  }
  console.error(action, code);
}
