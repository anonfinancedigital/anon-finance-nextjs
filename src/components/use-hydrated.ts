import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` in the server HTML and until hydration, `true` after. Password forms keep their submit
 * disabled until then, so a click or Enter before hydration cannot send the password natively.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
