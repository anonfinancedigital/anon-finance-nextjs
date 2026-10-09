"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { commitLegacyMigrationAction, loadLegacyDataAction } from "@/actions/legacy";
import { PasswordInput } from "@/components/password-input";
import { RecoveryKeyDialog } from "@/components/recovery-key-dialog";
import { useHydrated } from "@/components/use-hydrated";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SAVE_FAILED } from "@/lib/action-result";
import type { CommitLegacyMigrationPayload } from "@/lib/validation/legacy";
import { deviceKey } from "@/lib/vault/device-store";

/** Everything built in the browser before the user confirms the recovery key. */
interface Prepared {
  payload: CommitLegacyMigrationPayload;
  recoveryKey: string;
  dek: CryptoKey;
}

/**
 * One-time protection of a legacy account (SIGILO-23): password → plain rows → sealed package →
 * recovery key → one transaction on the server. Any failure leaves the account as it was (SIGILO-24).
 */
export function ProtectForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const loaded = await loadLegacyDataAction();
      if (!loaded.ok) {
        setError(loaded.error);
        return;
      }
      // Dynamic import keeps @noble/hashes out of the bundle until the migration runs.
      const [{ DEFAULT_KDF_PARAMS }, { createVaultMaterial }, { buildLegacyPackage }] = await Promise.all([
        import("@/lib/crypto/kdf"),
        import("@/lib/vault/create-vault"),
        import("@/lib/vault/legacy-package"),
      ]);
      const created = await createVaultMaterial({ password, userId, params: DEFAULT_KDF_PARAMS });
      const pkg = await buildLegacyPackage({ plain: loaded.data, userId, dek: created.dek });
      setPrepared({
        payload: { oldPassword: password, authSecret: created.server.authSecret, vault: created.server.material, pkg },
        recoveryKey: created.recoveryKey,
        dek: created.dek,
      });
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setPending(false);
    }
  }

  /** Sends the package only after the user confirmed the recovery key was saved. */
  async function commit(ready: Prepared) {
    setPrepared(null);
    setPending(true);
    try {
      const result = await commitLegacyMigrationAction(ready.payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await deviceKey.save(userId, ready.dek);
      router.push("/");
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm">
        Seus dados passarão a ser cifrados no seu navegador. Nesta única passagem o servidor ainda vê sua senha e
        seus dados em texto puro; depois disso eles ficam cifrados.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Senha atual</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Protegendo seus dados
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!hydrated || pending || prepared !== null}>
        Proteger meus dados
      </Button>
      {prepared !== null && (
        <RecoveryKeyDialog recoveryKey={prepared.recoveryKey} open onConfirmed={() => void commit(prepared)} />
      )}
    </form>
  );
}
