"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { activateBiometric } from "@/lib/biometric/activate";
import { shouldShowInvite } from "@/lib/biometric/invite-policy";
import { inviteStore, lockStore } from "@/lib/biometric/lock-store.client";
import { biometricSupport } from "@/lib/biometric/support";
import { LOCK_TEXT } from "@/lib/biometric/text";

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** One-time banner offering the biometric lock above the page content (INVITE-01 to INVITE-12). */
export function BiometricInvite({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  // Browser-only facts (WebAuthn support, localStorage) are read here, never during the server render.
  // Re-read on every navigation, so a lock enabled or disabled elsewhere is taken into account.
  useEffect(() => {
    let cancelled = false;
    void biometricSupport(window).then((supported) => {
      if (cancelled) return;
      setVisible(
        shouldShowInvite({
          supported,
          hasLock: lockStore.read(userId) !== null,
          dismissed: inviteStore.isDismissed(userId),
          pathname,
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId, pathname]);

  // navigator.credentials is touched only here, on the tap (INVITE-06).
  async function enable() {
    setPending(true);
    setFailed(false);
    const activated = await activateBiometric({
      credentials: navigator.credentials,
      userId,
      hostname: location.hostname,
      randomBytes,
      store: lockStore,
    });
    if (activated) setVisible(false);
    else setFailed(true);
    setPending(false);
  }

  function dismiss() {
    // A refused write still removes the invite for this page load (INVITE-11).
    inviteStore.dismiss(userId);
    setClosed(true);
  }

  if (!visible || closed) return null;

  return (
    <section
      aria-labelledby="biometric-invite-title"
      className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4 text-sm"
    >
      <h2 id="biometric-invite-title" className="font-medium">
        {LOCK_TEXT.inviteTitle}
      </h2>
      <p className="text-muted-foreground">{LOCK_TEXT.inviteText}</p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void enable()} disabled={pending}>
          {LOCK_TEXT.enable}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={dismiss}
          disabled={pending}
        >
          {LOCK_TEXT.dismiss}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-destructive">
          {LOCK_TEXT.enrollFailed}
        </p>
      )}
    </section>
  );
}
