"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { lockStore } from "@/lib/biometric/lock-store.client";
import { biometricSupport } from "@/lib/biometric/support";
import { LOCK_TEXT } from "@/lib/biometric/text";
import { enrollBiometric } from "@/lib/biometric/webauthn";

type Status = "checking" | "unsupported" | "off" | "on";

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Turns the biometric lock on and off on /conta; the record stays on this device (LOCK-01 to LOCK-06, LOCK-22). */
export function BiometricCard({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  // Browser-only facts (WebAuthn support, localStorage) are read here, never during the server render.
  useEffect(() => {
    let cancelled = false;
    void biometricSupport(window).then((supported) => {
      if (cancelled) return;
      // A saved record always offers "Desativar", even if support later disappeared.
      if (lockStore.read(userId) !== null) setStatus("on");
      else setStatus(supported ? "off" : "unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function enable() {
    setPending(true);
    setFailed(false);
    const result = await enrollBiometric({
      credentials: navigator.credentials,
      userId,
      hostname: location.hostname,
      randomBytes,
    });
    if (result.ok && lockStore.save(userId, result.credentialId)) setStatus("on");
    else setFailed(true);
    setPending(false);
  }

  function disable() {
    lockStore.clear();
    setFailed(false);
    setStatus("off");
  }

  if (status === "checking") return null;

  return (
    <ContentCard
      title={LOCK_TEXT.cardTitle}
      description={status === "unsupported" ? undefined : LOCK_TEXT.cardDescription}
      bodyClassName="space-y-3 px-6 pb-6 text-sm"
    >
      {status === "unsupported" && <p>{LOCK_TEXT.unsupported}</p>}
      {status === "off" && (
        <>
          <p className="text-muted-foreground">{LOCK_TEXT.methodHint}</p>
          <Button type="button" onClick={() => void enable()} disabled={pending}>
            {LOCK_TEXT.enable}
          </Button>
        </>
      )}
      {status === "on" && (
        <>
          <p role="status">{LOCK_TEXT.enabled}</p>
          <Button type="button" variant="outline" onClick={disable}>
            {LOCK_TEXT.disable}
          </Button>
        </>
      )}
      {failed && (
        <p role="alert" className="text-destructive">
          {LOCK_TEXT.enrollFailed}
        </p>
      )}
    </ContentCard>
  );
}
