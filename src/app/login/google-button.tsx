"use client";

import { useActionState } from "react";
import { signInGoogleAction } from "@/actions/auth-google";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/components/use-hydrated";
import type { ActionResult } from "@/lib/action-result";

/**
 * Starts the Google sign-in. The browser reaches Google through the Server Action's redirect, not a
 * native form post, so the CSP `form-action 'self'` does not apply.
 */
export function GoogleButton() {
  const [state, formAction, pending] = useActionState<ActionResult | undefined>(
    () => signInGoogleAction(),
    undefined,
  );
  const hydrated = useHydrated();
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="outline" className="w-full" disabled={!hydrated || pending}>
        Continuar com Google
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
