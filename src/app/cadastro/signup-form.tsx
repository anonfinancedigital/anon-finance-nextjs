"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { signUpSealedAction } from "@/actions/auth";
import { PasswordInput } from "@/components/password-input";
import { RecoveryKeyDialog } from "@/components/recovery-key-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { maskDateInput } from "@/lib/domain/date-br";
import { PASSWORD_MISMATCH_MESSAGE, signupSchema } from "@/lib/validation/signup";

const SENT_MESSAGE = "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo";

export function SignupForm() {
  const [state, setState] = useState<ActionResult | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /**
   * Validates here, builds the vault in the browser and sends only the SIGILO-11 fields: the
   * password itself never leaves the browser. The recovery key is shown before the final message.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({
      name: formData.get("name") ?? "",
      email: formData.get("email") ?? "",
      birthDate: formData.get("birthDate") ?? "",
      password: formData.get("password") ?? "",
      confirmPassword: formData.get("confirmPassword") ?? undefined,
    });
    if (!parsed.success) {
      setState(invalidInput(parsed.error));
      return;
    }

    setPending(true);
    try {
      const { name, email, birthDate: birthDateIso, password: plainPassword } = parsed.data;
      // Dynamic import keeps @noble/hashes out of the bundle until someone signs up.
      const [{ createVaultMaterial }, { DEFAULT_KDF_PARAMS }] = await Promise.all([
        import("@/lib/vault/create-vault"),
        import("@/lib/crypto/kdf"),
      ]);
      const userId = crypto.randomUUID();
      const created = await createVaultMaterial({
        password: plainPassword,
        userId,
        birthDateIso,
        params: DEFAULT_KDF_PARAMS,
      });
      const result = await signUpSealedAction({
        userId,
        name,
        email,
        authSecret: created.server.authSecret,
        vault: created.server.material,
        // Never null here: the birth date was given.
        birthDateCt: created.server.birthDateCt ?? "",
      });
      setState(result);
      if (result.ok) setRecoveryKey(created.recoveryKey);
    } catch {
      setState({ ok: false, error: SAVE_FAILED });
    } finally {
      setPending(false);
    }
  }

  if (state?.ok && confirmed) {
    return (
      <p role="status" className="text-sm">
        {SENT_MESSAGE}
      </p>
    );
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const mismatch = confirmPassword !== "" && confirmPassword !== password;
  const confirmError = mismatch ? PASSWORD_MISMATCH_MESSAGE : fieldErrors.confirmPassword;
  const generalError = state && !state.ok && !state.fieldErrors ? state.error : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
      </div>
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
        <Label htmlFor="password">Senha</Label>
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
      <Button type="submit" className="w-full" disabled={pending || mismatch || recoveryKey !== null}>
        Cadastrar
      </Button>
      <p className="text-center text-sm">
        <Link href="/privacidade" className="text-link hover:underline">
          Privacidade
        </Link>
      </p>
      {recoveryKey !== null && (
        <RecoveryKeyDialog recoveryKey={recoveryKey} open={!confirmed} onConfirmed={() => setConfirmed(true)} />
      )}
    </form>
  );
}
