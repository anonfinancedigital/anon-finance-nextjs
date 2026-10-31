/** The subset of the Web Storage API the lock needs; injected so the logic runs without a browser. */
export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const RELOCK_AFTER_MS = 60_000;
export const FRESH_LOGIN_WINDOW_MS = 300_000;
export const FRESH_LOGIN_KEY = "anon-fresh-login";

/** True when the page came back after being hidden for more than RELOCK_AFTER_MS. */
export function shouldRelock(hiddenAt: number | null, now: number): boolean {
  return hiddenAt !== null && now - hiddenAt > RELOCK_AFTER_MS;
}

/** Records the instant of a sign-in so the first load that follows skips the lock. Never throws. */
export function markFreshLogin(storage: SimpleStorage, now: number): void {
  try {
    storage.setItem(FRESH_LOGIN_KEY, String(now));
  } catch {
    // Storage refused: the lock simply asks once more.
  }
}

/** Reads and erases the sign-in mark; true when it exists and is at most FRESH_LOGIN_WINDOW_MS old. */
export function consumeFreshLogin(storage: SimpleStorage, now: number): boolean {
  try {
    const raw = storage.getItem(FRESH_LOGIN_KEY);
    storage.removeItem(FRESH_LOGIN_KEY);
    if (raw === null) return false;
    const markedAt = Number(raw);
    return Number.isFinite(markedAt) && now - markedAt <= FRESH_LOGIN_WINDOW_MS;
  } catch {
    return false;
  }
}
