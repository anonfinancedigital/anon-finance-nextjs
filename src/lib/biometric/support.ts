/** True only in a secure context where the platform offers a user-verifying authenticator (fingerprint, face, device PIN). */
export async function biometricSupport(env: {
  isSecureContext: boolean;
  PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> };
}): Promise<boolean> {
  const check = env.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
  if (!env.isSecureContext || typeof check !== "function") return false;
  try {
    return (await check.call(env.PublicKeyCredential)) === true;
  } catch {
    return false;
  }
}
