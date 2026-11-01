import type { SimpleStorage } from "./lock-policy";
import { createInviteStore } from "./invite-store";
import { createLockStore } from "./lock-store";

/** Defers the lookup of a browser storage to each call, so importing the module never touches it (SSR, Node). */
function lazyStorage(pick: () => Storage): SimpleStorage {
  return {
    getItem: (key) => pick().getItem(key),
    setItem: (key, value) => pick().setItem(key, value),
    removeItem: (key) => pick().removeItem(key),
  };
}

/** The one lock record of the browser; localStorage is synchronous, so the gate decides before rendering data. */
export const lockStore = createLockStore(lazyStorage(() => localStorage));

/** The browser's memory of a dismissed biometric invite; same lazy localStorage as the lock record. */
export const inviteStore = createInviteStore(lazyStorage(() => localStorage));

/** Where the "just signed in" mark lives: per tab, gone when the tab closes. */
export const freshLoginStorage = lazyStorage(() => sessionStorage);
