"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getResetVaultAction, resetPasswordSealedAction } from "@/actions/password-reset";
import { PasswordInput } from "@/components/password-input";
import { RecoveryKeyDialog } from "@/components/recovery-key-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { InvalidRecoveryKey } from "@/lib/crypto/recovery";
import { INVALID_LINK_MESSAGE, resetPasswordSchema } from "@/lib/validation/password-reset";
import { PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/signup";

const INVALID_RECOVERY_KEY = "Chave de recuperação inválida";
/** What the user types to confirm erasing every financial record (SIGILO-21). */
const WIPE_PHRASE = "APAGAR MEUS DADOS";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionResult | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKeyText, setRecoveryKeyText] = useState("");
  const [wipe, setWipe] = useState(false);
  const [wipePhrase, setWipePhrase] = useState("");
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  /**
   * With the recovery key: unwraps the DEK here and rewraps it under the new password (SIGILO-19); a
   * wrong key stops before the reset is sent (SIGILO-20). Without it: a new vault replaces the old one
   * and its recovery key is shown once before going to the login (SIGILO-21).
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      setState(invalidInput(parsed.error));
      return;
    }

    setPending(true);
    try {
      const owner = await getResetVaultAction(token);
      if (!owner.ok) {
        setState({ ok: false, error: owner.error });
        return;
      }
      // Dynamic import keeps @noble/hashes out of the bundle until a reset happens.
      const [{ DEFAULT_KDF_PARAMS }, { rewrapWithRecovery }, { createVaultMaterial }] = await Promise.all([
        import("@/lib/crypto/kdf"),
        import("@/lib/vault/recover-vault"),
        import("@/lib/vault/create-vault"),
      ]);

      if (wipe) {
        const created = await createVaultMaterial({
          password: parsed.data.password,
          userId: owner.userId,
          params: DEFAULT_KDF_PARAMS,
        });
        const result = await resetPasswordSealedAction({
          token,
          mode: "wipe",
          authSecret: created.server.authSecret,
          vault: created.server.material,
        });
        setState(result);
        if (result.ok) setNewRecoveryKey(created.recoveryKey);
        return;
      }

      let rewrapped: Awaited<ReturnType<typeof rewrapWithRecovery>>;
      try {
        rewrapped = await rewrapWithRecovery({
          recoveryKeyText,
          dekWrappedRecovery: owner.dekWrappedRecovery,
          newPassword: parsed.data.password,
          userId: owner.userId,
          params: DEFAULT_KDF_PARAMS,
        });
      } catch (error) {
        if (!(error instanceof InvalidRecoveryKey)) throw error;
        setState({ ok: false, error: INVALID_RECOVERY_KEY });
        return;
      }
      const { material } = rewrapped;
      const result = await resetPasswordSealedAction({
        token,
        mode: "rewrap",
        authSecret: rewrapped.authSecret,
        salt: material.salt,
        params: { memKib: material.memKib, iterations: material.iterations, parallelism: material.parallelism },
        dekWrappedPw: material.dekWrappedPw,
      });
      setState(result);
      if (result.ok) router.push("/login");
    } catch {
      setState({ ok: false, error: SAVE_FAILED });
    } finally {
      setPending(false);
    }
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const mismatch = confirmPassword !== "" && confirmPassword !== password;
  const confirmError = mismatch ? PASSWORD_MISMATCH_MESSAGE : fieldErrors.confirmPassword;
  const generalError =
    state && !state.ok ? (state.fieldErrors ? fieldErrors.token : state.error) : undefined;
  const wipeConfirmed = wipePhrase === WIPE_PHRASE;
  const done = state?.ok === true;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
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
      {wipe ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">
            Sem a chave de recuperação, seus dados financeiros não podem ser abertos. Para redefinir a senha, todos
            eles serão apagados e não poderão ser recuperados. Para confirmar, digite {WIPE_PHRASE}.
          </p>
          <Label htmlFor="wipePhrase">Confirmação</Label>
          <Input
            id="wipePhrase"
            name="wipePhrase"
            autoComplete="off"
            required
            value={wipePhrase}
            onChange={(event) => setWipePhrase(event.target.value)}
          />
          <button
            type="button"
            className="text-sm text-link hover:underline"
            onClick={() => {
              setWipe(false);
              setWipePhrase("");
            }}
          >
            Tenho a chave de recuperação
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="recoveryKey">Chave de recuperação</Label>
          <Input
            id="recoveryKey"
            name="recoveryKey"
            autoComplete="off"
            spellCheck={false}
            required
            value={recoveryKeyText}
            onChange={(event) => setRecoveryKeyText(event.target.value)}
            aria-invalid={generalError === INVALID_RECOVERY_KEY}
          />
          <button type="button" className="text-sm text-link hover:underline" onClick={() => setWipe(true)}>
            Não tenho a chave de recuperação
          </button>
        </div>
      )}
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
      {generalError === INVALID_LINK_MESSAGE && (
        <p className="text-sm">
          <Link href="/esqueci-senha" className="text-link hover:underline">
            Pedir outro link
          </Link>
        </p>
      )}
      <Button
        type="submit"
        variant={wipe ? "destructive" : "default"}
        className="w-full"
        disabled={pending || mismatch || done || (wipe && !wipeConfirmed)}
      >
        {wipe ? "Apagar dados e redefinir senha" : "Redefinir senha"}
      </Button>
      {newRecoveryKey !== null && (
        <RecoveryKeyDialog recoveryKey={newRecoveryKey} open onConfirmed={() => router.push("/login")} />
      )}
    </form>
  );
}
