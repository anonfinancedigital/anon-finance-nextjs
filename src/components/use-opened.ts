"use client";

import { useEffect, useState } from "react";
import { useVault } from "@/components/vault-provider";

export { LOAD_ERROR_MESSAGE } from "@/components/load-error";

type Opened<T> = { data: T | null; error: boolean; loading: boolean };

const sameDeps = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

/**
 * Runs `open` with the DEK whenever `deps` change and returns its result. Any failure gives
 * `error: true` and `data: null`, never partial data (SIGILO-06); pages show `LOAD_ERROR_MESSAGE`.
 * A result for deps that are no longer current is dropped.
 */
export function useOpened<T>(open: (dek: CryptoKey, userId: string) => Promise<T>, deps: unknown[]): Opened<T> {
  const { dek, userId } = useVault();
  const key = [dek, userId, ...deps];
  const [settled, setSettled] = useState<{ key: unknown[]; data: T | null; error: boolean } | null>(null);

  useEffect(() => {
    let current = true;
    open(dek, userId).then(
      (data) => {
        if (current) setSettled({ key, data, error: false });
      },
      () => {
        if (current) setSettled({ key, data: null, error: true });
      },
    );
    return () => {
      current = false;
    };
    // `deps` stands for `open`, like `useCallback`; `key` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  // Until the result for the current deps arrives, nothing from older deps is shown.
  if (!settled || !sameDeps(settled.key, key)) return { data: null, error: false, loading: true };
  return { data: settled.data, error: settled.error, loading: false };
}
