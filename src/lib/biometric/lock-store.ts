import type { SimpleStorage } from "./lock-policy";

export const LOCK_KEY = "anon-biometric-lock";

/** The biometric lock record of this device; the credential id is not a secret but never leaves the browser. */
export function createLockStore(storage: SimpleStorage) {
  function remove() {
    try {
      storage.removeItem(LOCK_KEY);
    } catch {
      // Nothing more to do: a record that cannot be removed also cannot be read.
    }
  }

  return {
    /** The credential id saved for this user; a record of another user is removed. */
    read(userId: string): string | null {
      try {
        const raw = storage.getItem(LOCK_KEY);
        if (raw === null) return null;
        const record: unknown = JSON.parse(raw);
        if (typeof record !== "object" || record === null) return null;
        const { userId: savedUserId, credentialId } = record as Record<string, unknown>;
        if (typeof savedUserId !== "string" || typeof credentialId !== "string") return null;
        if (savedUserId !== userId) {
          remove();
          return null;
        }
        return credentialId;
      } catch {
        return null;
      }
    },
    save(userId: string, credentialId: string): boolean {
      try {
        storage.setItem(LOCK_KEY, JSON.stringify({ userId, credentialId }));
        return true;
      } catch {
        remove();
        return false;
      }
    },
    clear(): void {
      remove();
    },
  };
}
