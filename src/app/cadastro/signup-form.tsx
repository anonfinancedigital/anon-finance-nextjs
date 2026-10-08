"use client";

import { useActionState, useState } from "react";
import { signUpAction } from "@/actions/auth";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskDateInput } from "@/lib/domain/date-br";
import { PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/signup";

const SENT_MESSAGE = "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, undefined);
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (state?.ok) {
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
    <form action={formAction} className="space-y-4">
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
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || mismatch}>
        Cadastrar
      </Button>
    </form>
  );
}
