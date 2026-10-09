import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";

// Not a "use server" module: its exports must not become public Server Actions.
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;

/**
 * Minutes until the e-mail is released, or 0 when it is not locked.
 * The lock starts at the failure that completed 5 failures within 15 minutes and lasts 15 minutes.
 * Attempts made while locked are not recorded, so that failure is always the latest one.
 */
export async function lockedMinutes(email: string): Promise<number> {
  const latest = await loginAttemptsRepo.latestFailure(email);
  if (!latest) return 0;

  const releaseAt = latest.getTime() + WINDOW_MS;
  const now = Date.now();
  if (releaseAt <= now) return 0;

  const failures = await loginAttemptsRepo.countRecentFailures(
    email,
    new Date(latest.getTime() - WINDOW_MS),
  );
  if (failures < MAX_FAILURES) return 0;
  return Math.ceil((releaseAt - now) / 60_000);
}
