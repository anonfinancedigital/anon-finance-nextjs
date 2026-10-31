import { describe, expect, it, vi } from "vitest";
import { toBase64Url } from "../crypto/base64url";
import { enrollBiometric, verifyBiometric } from "./webauthn";

const CHALLENGE = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const RAW_ID = Uint8Array.from([250, 251, 252, 253, 254, 255, 1, 2, 3]);
const randomBytes = vi.fn((length: number) => {
  expect(length).toBe(32);
  return CHALLENGE;
});

function credentialsWith(result: () => Promise<unknown>) {
  return {
    create: vi.fn(result),
    get: vi.fn(result),
  } as unknown as Pick<CredentialsContainer, "create" | "get"> & {
    create: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
}

describe("enrollBiometric", () => {
  it("passes exactly the options of LOCK-03 to credentials.create", async () => {
    const credentials = credentialsWith(async () => ({ rawId: RAW_ID.buffer }));
    await enrollBiometric({ credentials, userId: "user-1", hostname: "anon.example.com", randomBytes });

    expect(credentials.create).toHaveBeenCalledTimes(1);
    const { publicKey } = credentials.create.mock.calls[0][0];
    expect(publicKey.authenticatorSelection.authenticatorAttachment).toBe("platform");
    expect(publicKey.authenticatorSelection.userVerification).toBe("required");
    expect(publicKey.authenticatorSelection.residentKey).toBe("discouraged");
    expect(publicKey.challenge).toEqual(CHALLENGE);
    expect(publicKey.rp.id).toBe("anon.example.com");
    expect(publicKey.rp.name).toBe("ANON");
    expect(publicKey.user.name).toBe("ANON");
    expect(publicKey.user.displayName).toBe("ANON");
    expect(publicKey.user.id).toEqual(new TextEncoder().encode("user-1"));
    expect(publicKey.timeout).toBe(60000);
    expect(publicKey.pubKeyCredParams).toEqual([
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ]);
  });

  it("returns the rawId as base64url (LOCK-04)", async () => {
    const credentials = credentialsWith(async () => ({ rawId: RAW_ID.buffer }));
    const result = await enrollBiometric({ credentials, userId: "user-1", hostname: "h", randomBytes });
    expect(result).toEqual({ ok: true, credentialId: toBase64Url(RAW_ID) });
  });

  it("returns { ok: false } for a null credential (LOCK-05)", async () => {
    const credentials = credentialsWith(async () => null);
    expect(await enrollBiometric({ credentials, userId: "u", hostname: "h", randomBytes })).toEqual({ ok: false });
  });

  it.each([
    ["rejection", () => Promise.reject(new Error("boom"))],
    ["NotAllowedError", () => Promise.reject(new DOMException("cancelled", "NotAllowedError"))],
    ["synchronous throw", () => {
      throw new Error("no webauthn");
    }],
  ])("returns { ok: false } on %s without throwing (LOCK-05)", async (_name, fail) => {
    const credentials = credentialsWith(fail as () => Promise<unknown>);
    await expect(enrollBiometric({ credentials, userId: "u", hostname: "h", randomBytes })).resolves.toEqual({
      ok: false,
    });
  });
});

describe("verifyBiometric", () => {
  const credentialId = toBase64Url(RAW_ID);

  it("passes exactly the options of LOCK-11 to credentials.get", async () => {
    const credentials = credentialsWith(async () => ({ id: "x" }));
    await verifyBiometric({ credentials, credentialId, randomBytes });

    expect(credentials.get).toHaveBeenCalledTimes(1);
    const { publicKey } = credentials.get.mock.calls[0][0];
    expect(publicKey.allowCredentials).toEqual([{ type: "public-key", id: RAW_ID }]);
    expect(publicKey.userVerification).toBe("required");
    expect(publicKey.challenge).toEqual(CHALLENGE);
    expect(publicKey.timeout).toBe(60000);
  });

  it("returns true when get resolves with a credential (LOCK-12)", async () => {
    const credentials = credentialsWith(async () => ({ id: "x" }));
    expect(await verifyBiometric({ credentials, credentialId, randomBytes })).toBe(true);
  });

  it("returns false for a null credential (LOCK-13)", async () => {
    const credentials = credentialsWith(async () => null);
    expect(await verifyBiometric({ credentials, credentialId, randomBytes })).toBe(false);
  });

  it.each([
    ["rejection", () => Promise.reject(new Error("boom"))],
    ["NotAllowedError", () => Promise.reject(new DOMException("cancelled", "NotAllowedError"))],
  ])("returns false on %s without throwing (LOCK-13)", async (_name, fail) => {
    const credentials = credentialsWith(fail);
    await expect(verifyBiometric({ credentials, credentialId, randomBytes })).resolves.toBe(false);
  });

  it("returns false for a corrupted credentialId without calling get (LOCK-13)", async () => {
    const credentials = credentialsWith(async () => ({ id: "x" }));
    expect(await verifyBiometric({ credentials, credentialId: "***", randomBytes })).toBe(false);
    expect(credentials.get).not.toHaveBeenCalled();
  });
});
