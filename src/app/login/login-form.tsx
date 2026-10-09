"use client";

import Link from "next/link";
import { type FormEvent, startTransition, useActionState, useEffect, useState } from "react";
import { signInAction } from "@/actions/auth";
import { getKdfParamsAction } from "@/actions/vault";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { useHydrated } from "@/components/use-hydrated";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromBase64Url } from "@/lib/crypto/base64url";
import { deviceKey } from "@/lib/vault/device-store";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, undefined);
  const [email, setEmail] = useState("");
  const [deriving, setDeriving] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const hydrated = useHydrated();
  const forgotHref = email.trim() ? `/esqueci-senha?email=${encodeURIComponent(email.trim())}` : "/esqueci-senha";
  const error = prepareError ?? (state && !state.ok ? state.error : null);

  // Opening the login form drops any DEK left on this device (SIGILO-16).
  useEffect(() => {
    void deviceKey.clear();
  }, []);

  // A refused sign-in must not leave the KEK waiting for a session that will not come.
  useEffect(() => {
    if (state && !state.ok) void deviceKey.pendingKek.clear();
  }, [state]);

  /**
   * Account with a vault: derives the login secret and the KEK here and sends only the secret in the
   * `password` field (SIGILO-13). Legacy account: sends the password as before (SIGILO-22).
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPrepareError(null);
    setDeriving(true);
    try {
      const params = await getKdfParamsAction(email.trim());
      if (!("mode" in params)) {
        setPrepareError(params.error);
        return;
      }
      if (params.mode === "v1") {
        // Dynamic import keeps @noble/hashes out of the bundle until someone signs in.
        const { deriveKeys } = await import("@/lib/crypto/kdf");
        const password = String(formData.get("password") ?? "");
        const { authSecret, kek } = await deriveKeys(password, fromBase64Url(params.salt), {
          m: params.m,
          t: params.t,
          p: params.p,
        });
        await deviceKey.pendingKek.save(kek);
        formData.set("password", authSecret);
      } else {
        await deviceKey.pendingKek.clear();
      }
    } finally {
      setDeriving(false);
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-4">
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
      {deriving && (
        <p role="status" className="text-sm text-muted-foreground">
          Protegendo seus dados
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!hydrated || pending || deriving}>
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
      <p className="text-center text-sm">
        <Link href="/privacidade" className="text-link hover:underline">
          Privacidade
        </Link>
      </p>
    </form>
  );
}
