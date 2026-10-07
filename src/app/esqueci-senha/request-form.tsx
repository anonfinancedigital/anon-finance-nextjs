"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REQUEST_SENT_MESSAGE } from "@/lib/validation/password-reset";

export function RequestForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="text-sm">
        {REQUEST_SENT_MESSAGE}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={defaultEmail}
          required
        />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        Enviar link
      </Button>
    </form>
  );
}
