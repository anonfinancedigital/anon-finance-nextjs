const ACCOUNT_PATH = "/conta";

/** True when the biometric invite should appear: a capable device, no lock, no dismissal, and not on /conta (which has the card). */
export function shouldShowInvite({
  supported,
  hasLock,
  dismissed,
  pathname,
}: {
  supported: boolean;
  hasLock: boolean;
  dismissed: boolean;
  pathname: string;
}): boolean {
  const onAccountPage = pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`);
  return supported && !hasLock && !dismissed && !onAccountPage;
}
