"use client";

import { type FormEvent, useState } from "react";
import { getVaultAction } from "@/actions/vault";
import { Logo } from "@/components/brand/Logo";
import { LOAD_ERROR_MESSAGE } from "@/components/load-error";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deviceKey } from "@/lib/vault/device-store";

const WRONG_PASSWORD = "Senha incorreta";

/**
 * "Desbloquear" (SIGILO-17): the session is valid but this device has no DEK. The password only
 * derives the KEK here in the browser; the server just returns the wrapped DEK of the session user.
 */
export function UnlockScreen({ userId, onUnlocked }: { userId: string; onUnlocked: (dek: CryptoKey) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      const result = await getVaultAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { vault } = result;
      // Loaded on demand: Argon2id (@noble/hashes) stays out of the app bundle.
      const { unlockVault, WrongPasswordError } = await import("@/lib/vault/unlock-vault");
      let dek: CryptoKey;
      try {
        dek = await unlockVault({
          password,
          params: { m: vault.memKib, t: vault.iterations, p: vault.parallelism },
          salt: vault.salt,
          dekWrappedPw: vault.dekWrappedPw,
          userId,
        });
      } catch (unlockError) {
        if (unlockError instanceof WrongPasswordError) {
          setError(WRONG_PASSWORD);
          return;
        }
        throw unlockError;
      }
      onUnlocked(await deviceKey.save(userId, dek));
    } catch {
      setError(LOAD_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <Logo />
          <h1 className="font-heading text-lg font-semibold">Desbloquear</h1>
          <p className="text-sm text-muted-foreground">Digite sua senha para abrir seus dados neste dispositivo.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-password">Senha</Label>
            <PasswordInput id="unlock-password" name="password" autoComplete="current-password" required autoFocus />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Protegendo seus dados" : "Desbloquear"}
          </Button>
        </form>
      </div>
    </div>
  );
}
