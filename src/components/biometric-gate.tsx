"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { LockScreen } from "@/components/lock-screen";
import { consumeFreshLogin, shouldRelock } from "@/lib/biometric/lock-policy";
import { freshLoginStorage, lockStore } from "@/lib/biometric/lock-store.client";

/**
 * The lock of this page load: the credential id while locked, `null` while open. Kept at module level
 * because `consumeFreshLogin` erases the sign-in mark when it reads it, and Strict Mode (or a remount)
 * would otherwise decide a second time and lock a session that just signed in.
 */
let decision: { userId: string; lockedWith: string | null } | null = null;

function remember(userId: string, lockedWith: string | null): string | null {
  decision = { userId, lockedWith };
  return lockedWith;
}

/** Runs once per load. Only reached on the client: the `VaultProvider` renders no children on the server. */
function decideInitial(userId: string): string | null {
  if (decision?.userId === userId) return decision.lockedWith;
  const credentialId = lockStore.read(userId);
  // Always consume, so a mark left by a sign-in without a lock cannot skip a lock enabled later.
  const freshLogin = consumeFreshLogin(freshLoginStorage, Date.now());
  return remember(userId, credentialId !== null && !freshLogin ? credentialId : null);
}

/**
 * Shows the biometric `LockScreen` instead of `children` while this device has a lock for the user:
 * on opening (unless the user just signed in) and on returning after more than a minute hidden.
 * Without a lock record it renders `children` straight away and never touches `navigator.credentials`.
 */
export function BiometricGate({ userId, children }: { userId: string; children: ReactNode }) {
  const [lockedWith, setLockedWith] = useState<string | null>(() => decideInitial(userId));
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const wasHiddenAt = hiddenAt.current;
      hiddenAt.current = null;
      if (!shouldRelock(wasHiddenAt, Date.now())) return;
      // Read on every event: the lock may have been enabled or disabled since the last one.
      const credentialId = lockStore.read(userId);
      if (credentialId !== null) setLockedWith(remember(userId, credentialId));
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [userId]);

  if (lockedWith !== null) {
    return (
      <LockScreen
        key={lockedWith}
        userId={userId}
        credentialId={lockedWith}
        onUnlocked={() => setLockedWith(remember(userId, null))}
      />
    );
  }
  return <>{children}</>;
}
