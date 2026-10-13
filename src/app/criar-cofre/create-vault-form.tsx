"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createVaultAction } from "@/actions/vault";
import { PasswordInput } from "@/components/password-input";
import { RecoveryKeyDialog } from "@/components/recovery-key-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/components/use-hydrated";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { maskDateInput } from "@/lib/domain/date-br";
import { createVaultFormSchema } from "@/lib/validation/create-vault";
import { PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/signup";
import { deviceKey } from "@/lib/vault/device-store";

/** The recovery key and the DEK created in the browser, held until the user confirms the key is saved. */
interface Created {
  recoveryKey: string;
  dek: CryptoKey;
}

/**
 * Creates the vault of an account that entered only through Google. The keys are built here and the
 * server receives only wrapped keys and the sealed birth date; the vault password never leaves the
 * browser. The recovery key is shown once the server has saved the vault.
 */
export function CreateVaultForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionResult | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = createVaultFormSchema.safeParse({
      password: formData.get("password") ?? "",
      confirmPassword: formData.get("confirmPassword") ?? undefined,
      birthDate: formData.get("birthDate") ?? "",
    });
    if (!parsed.success) {
      setState(invalidInput(parsed.error));
      return;
    }

    setPending(true);
    try {
      // Dynamic import keeps @noble/hashes out of the bundle until someone creates a vault.
      const [{ createVaultMaterial }, { DEFAULT_KDF_PARAMS }] = await Promise.all([
        import("@/lib/vault/create-vault"),
        import("@/lib/crypto/kdf"),
      ]);
      const vault = await createVaultMaterial({
        password: parsed.data.password,
        userId,
        birthDateIso: parsed.data.birthDate,
        params: DEFAULT_KDF_PARAMS,
      });
      // `authSecret` is dropped on purpose: a Google account has no password login to derive it for.
      const result = await createVaultAction({
        vault: vault.server.material,
        birthDateCt: vault.server.birthDateCt ?? "",
      });
      setState(result);
      if (result.ok) setCreated({ recoveryKey: vault.recoveryKey, dek: vault.dek });
    } catch {
      setState({ ok: false, error: SAVE_FAILED });
    } finally {
      setPending(false);
    }
  }

  async function finish(ready: Created) {
    await deviceKey.save(userId, ready.dek);
    router.replace("/");
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const mismatch = confirmPassword !== "" && confirmPassword !== password;
  const confirmError = mismatch ? PASSWORD_MISMATCH_MESSAGE : fieldErrors.confirmPassword;
  const generalError = state && !state.ok && !state.fieldErrors ? state.error : undefined;

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="birthDate">Data de nascimento</Label>
        <Input
          id="birthDate"
          name="birthDate"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="bday"
          required
          value={birthDate}
          onChange={(event) => setBirthDate(maskDateInput(event.target.value))}
          aria-invalid={!!fieldErrors.birthDate}
        />
        {fieldErrors.birthDate && <p className="text-sm text-destructive">{fieldErrors.birthDate}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha do cofre</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={!!confirmError}
          aria-describedby={confirmError ? "confirmPassword-error" : undefined}
        />
        {confirmError && (
          <p id="confirmPassword-error" className="text-sm text-destructive">
            {confirmError}
          </p>
        )}
      </div>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Protegendo seus dados
        </p>
      )}
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!hydrated || pending || mismatch || created !== null}>
        Criar cofre
      </Button>
      {created !== null && (
        <RecoveryKeyDialog recoveryKey={created.recoveryKey} open onConfirmed={() => void finish(created)} />
      )}
    </form>
  );
}
