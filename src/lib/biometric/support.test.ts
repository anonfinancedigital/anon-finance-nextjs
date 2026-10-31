import { describe, expect, it } from "vitest";
import { biometricSupport } from "./support";

const platform = (available: () => Promise<boolean>) => ({
  isUserVerifyingPlatformAuthenticatorAvailable: available,
});

describe("biometricSupport (LOCK-01, LOCK-02)", () => {
  it("is true with a secure context, the API and a platform check resolving true", async () => {
    expect(
      await biometricSupport({ isSecureContext: true, PublicKeyCredential: platform(async () => true) }),
    ).toBe(true);
  });

  it("is false in an insecure context", async () => {
    expect(
      await biometricSupport({ isSecureContext: false, PublicKeyCredential: platform(async () => true) }),
    ).toBe(false);
  });

  it("is false without PublicKeyCredential", async () => {
    expect(await biometricSupport({ isSecureContext: true })).toBe(false);
  });

  it("is false when the platform check function is missing", async () => {
    expect(await biometricSupport({ isSecureContext: true, PublicKeyCredential: {} })).toBe(false);
  });

  it("is false when the platform check resolves false", async () => {
    expect(
      await biometricSupport({ isSecureContext: true, PublicKeyCredential: platform(async () => false) }),
    ).toBe(false);
  });

  it("is false when the platform check rejects", async () => {
    expect(
      await biometricSupport({
        isSecureContext: true,
        PublicKeyCredential: platform(() => Promise.reject(new Error("boom"))),
      }),
    ).toBe(false);
  });
});
