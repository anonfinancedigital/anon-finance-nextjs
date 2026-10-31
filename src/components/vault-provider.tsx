"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getVaultAction } from "@/actions/vault";
import { BrandSplash } from "@/components/brand-splash";
import { LOAD_ERROR_MESSAGE } from "@/components/load-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UnlockScreen } from "@/components/unlock-screen";
import { DecryptError } from "@/lib/crypto/aead";
import { unwrapDek } from "@/lib/crypto/wrap";
import { deviceKey } from "@/lib/vault/device-store";

type VaultState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "ready"; dek: CryptoKey }
  | { status: "error" };

type Vault = { dek: CryptoKey; userId: string };

/** Only set while the vault is `ready`: children never render without the DEK (SIGILO-17). */
const VaultContext = createContext<Vault | null>(null);

/** The open vault. Throws outside `<VaultProvider>` (or before the DEK is loaded). */
export function useVault(): Vault {
  const vault = useContext(VaultContext);
  if (!vault) throw new Error("useVault precisa ser usado dentro de <VaultProvider> com o cofre aberto");
  return vault;
}

/**
 * The DEK of `userId` on this device. Without one, consumes the KEK left by the login and unwraps the
 * DEK with it (SIGILO-13). `take()` removes the pending KEK before returning it, so it is gone
 * whether the unwrap succeeds or fails. `null` means the device must be unlocked with the password.
 */
async function loadDek(userId: string): Promise<CryptoKey | null> {
  const stored = await deviceKey.load(userId);
  if (stored) return stored;

  const kek = await deviceKey.pendingKek.take();
  if (!kek) return null;

  const result = await getVaultAction();
  if (!result.ok) return null;

  let dekRaw: Uint8Array;
  try {
    dekRaw = await unwrapDek(kek, result.vault.dekWrappedPw, userId);
  } catch (error) {
    if (error instanceof DecryptError) return null;
    throw error;
  }
  try {
    return await deviceKey.save(userId, dekRaw);
  } finally {
    dekRaw.fill(0);
  }
}

// One load per user at a time: a remounted provider (Strict Mode) awaits the same pending KEK.
let inFlight: { userId: string; dek: Promise<CryptoKey | null> } | null = null;

function loadDekOnce(userId: string): Promise<CryptoKey | null> {
  if (inFlight?.userId !== userId) {
    const dek = loadDek(userId).finally(() => {
      if (inFlight?.dek === dek) inFlight = null;
    });
    inFlight = { userId, dek };
  }
  return inFlight.dek;
}

/** Opens the vault of the session user and renders `children` only once the DEK is in hand. */
export function VaultProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<VaultState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    loadDekOnce(userId).then(
      (dek) => current && setState(dek ? { status: "ready", dek } : { status: "locked" }),
      () => current && setState({ status: "error" }),
    );
    return () => {
      current = false;
    };
  }, [userId, attempt]);

  const dek = state.status === "ready" ? state.dek : null;
  const vault = useMemo(() => (dek ? { dek, userId } : null), [dek, userId]);

  if (state.status === "loading") return <BrandSplash />;
  // Locked: "Desbloquear" replaces the children, none renders without the DEK (SIGILO-17).
  if (state.status === "locked") {
    return <UnlockScreen userId={userId} onUnlocked={(unlocked) => setState({ status: "ready", dek: unlocked })} />;
  }
  if (state.status === "error" || !vault) {
    return (
      <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
        <AlertDescription>{LOAD_ERROR_MESSAGE}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Tentar novamente
        </Button>
      </Alert>
    );
  }
  return <VaultContext.Provider value={vault}>{children}</VaultContext.Provider>;
}
