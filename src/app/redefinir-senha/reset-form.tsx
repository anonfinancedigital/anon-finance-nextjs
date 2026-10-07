"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction } from "@/actions/password-reset";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/signup";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const mismatch = confirmPassword !== "" && confirmPassword !== password;
  const confirmError = mismatch ? PASSWORD_MISMATCH_MESSAGE : fieldErrors.confirmPassword;
  const generalError =
    state && !state.ok ? (state.fieldErrors ? fieldErrors.token : state.error) : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
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
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || mismatch}>
        Redefinir senha
      </Button>
    </form>
  );
}
