"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, undefined);
  const [email, setEmail] = useState("");
  const forgotHref = email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : "/esqueci-senha";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        Entrar
      </Button>
      <p className="flex justify-between text-sm">
        <Link href={forgotHref} className="text-link hover:underline">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="text-link hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
