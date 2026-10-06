"use client";

import { useActionState } from "react";
import { signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SENT_MESSAGE = "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="text-sm">
        {SENT_MESSAGE}
      </p>
    );
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
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
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
      </div>
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        Cadastrar
      </Button>
    </form>
  );
}
