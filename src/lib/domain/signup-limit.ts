export const SIGNUP_MAX = 5;
export const SIGNUP_WINDOW_MS = 3_600_000;

/**
 * Minutes until the IP may sign up again, or 0 when it is not limited.
 * `times` are the signups inside the window, oldest first. The lock lasts until the oldest of the
 * 5 most recent signups leaves the window.
 */
export function signupLockMinutes(times: Date[], now: number): number {
  if (times.length < SIGNUP_MAX) return 0;
  const oldest = times[times.length - SIGNUP_MAX].getTime();
  const releaseAt = oldest + SIGNUP_WINDOW_MS;
  if (releaseAt <= now) return 0;
  return Math.ceil((releaseAt - now) / 60_000);
}
