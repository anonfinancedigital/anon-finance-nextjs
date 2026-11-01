import type { SimpleStorage } from "./lock-policy";

export const INVITE_KEY = "anon-biometric-invite-dismissed";

/** Remembers on this device that a user dismissed the biometric invite; the record holds only the user id. */
export function createInviteStore(storage: SimpleStorage) {
  return {
    /** True when this user dismissed the invite. Unreadable storage also answers true: without a memory, no invite. */
    isDismissed(userId: string): boolean {
      try {
        const raw = storage.getItem(INVITE_KEY);
        if (raw === null) return false;
        const record: unknown = JSON.parse(raw);
        if (typeof record !== "object" || record === null) return true;
        const { userId: savedUserId } = record as Record<string, unknown>;
        return typeof savedUserId !== "string" || savedUserId === userId;
      } catch {
        return true;
      }
    },
    dismiss(userId: string): boolean {
      try {
        storage.setItem(INVITE_KEY, JSON.stringify({ userId }));
        return true;
      } catch {
        return false;
      }
    },
    clear(): void {
      try {
        storage.removeItem(INVITE_KEY);
      } catch {
        // Nothing more to do.
      }
    },
  };
}
