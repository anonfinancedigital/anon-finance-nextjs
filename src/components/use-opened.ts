"use client";

import { useEffect, useState } from "react";
import { useVault } from "@/components/vault-provider";

export { LOAD_ERROR_MESSAGE } from "@/components/load-error";

type Opened<T> = { data: T | null; error: boolean; loading: boolean };

const sameDeps = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

type Settled<T> = { key: unknown[]; stale: unknown[]; data: T | null; error: boolean };

/**
 * What to show for the current `key`. A result for older deps is dropped, except while reloading the
 * same `stale` identity (same DEK, user and `staleDeps`): then the last good data stays on screen, so a
 * refresh after a save does not swap the page for a skeleton and lose the scroll position.
 */
export function resolveOpened<T>(settled: Settled<T> | null, key: unknown[], stale: unknown[]): Opened<T> {
  if (settled && sameDeps(settled.key, key)) return { data: settled.data, error: settled.error, loading: false };
  if (settled && !settled.error && settled.data !== null && sameDeps(settled.stale, stale)) {
    return { data: settled.data, error: false, loading: true };
  }
  return { data: null, error: false, loading: true };
}

/**
 * Runs `open` with the DEK whenever `deps` change and returns its result. Any failure gives
 * `error: true` and `data: null`, never partial data (SIGILO-06); pages show `LOAD_ERROR_MESSAGE`.
 * A result for deps that are no longer current is dropped. With `staleDeps`, the previous data is kept
 * while reloading as long as those values (and the DEK and user) are unchanged.
 */
export function useOpened<T>(
  open: (dek: CryptoKey, userId: string) => Promise<T>,
  deps: unknown[],
  staleDeps?: unknown[],
): Opened<T> {
  const { dek, userId } = useVault();
  const key = [dek, userId, ...deps];
  const stale = staleDeps ? [dek, userId, ...staleDeps] : [{}];
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    let current = true;
    open(dek, userId).then(
      (data) => {
        if (current) setSettled({ key, stale, data, error: false });
      },
      () => {
        if (current) setSettled({ key, stale, data: null, error: true });
      },
    );
    return () => {
      current = false;
    };
    // `deps` stands for `open`, like `useCallback`; `key` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  // Until the result for the current deps arrives, nothing from older deps is shown (see `resolveOpened`).
  return resolveOpened(settled, key, stale);
}
