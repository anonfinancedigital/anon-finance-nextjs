"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { UnlockScreen } from "@/components/unlock-screen";
import { LOCK_TEXT } from "@/lib/biometric/text";
import { verifyBiometric } from "@/lib/biometric/webauthn";

type Mode = "verifying" | "failed" | "password";

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * "ANON bloqueado": asks the platform for the saved credential once on mount, then only when the
 * user taps "Tentar de novo" (LOCK-13). "Usar a senha" hands over to the existing `UnlockScreen`.
 */
export function LockScreen({
  userId,
  credentialId,
  onUnlocked,
}: {
  userId: string;
  credentialId: string;
  onUnlocked: () => void;
}) {
  const [mode, setMode] = useState<Mode>("verifying");
  const autoStarted = useRef(false);

  async function verify() {
    setMode("verifying");
    const ok = await verifyBiometric({ credentials: navigator.credentials, credentialId, randomBytes });
    if (ok) onUnlocked();
    // Keep the password screen if the user switched to it while the prompt was open.
    else setMode((current) => (current === "verifying" ? "failed" : current));
  }

  useEffect(() => {
    // Strict Mode runs this effect twice in dev: the ref keeps the automatic prompt to one call.
    if (autoStarted.current) return;
    autoStarted.current = true;
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, guarded by the ref
  }, []);

  if (mode === "password") return <UnlockScreen userId={userId} onUnlocked={() => onUnlocked()} />;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <Logo />
          <h1 className="font-heading text-lg font-semibold">{LOCK_TEXT.lockedTitle}</h1>
          {mode === "failed" && (
            <p role="alert" className="text-sm text-destructive">
              {LOCK_TEXT.verifyFailed}
            </p>
          )}
        </div>
        <div className="space-y-2">
          {mode === "failed" && (
            <Button type="button" className="w-full" onClick={() => void verify()}>
              {LOCK_TEXT.retry}
            </Button>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={() => setMode("password")}>
            {LOCK_TEXT.usePassword}
          </Button>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
