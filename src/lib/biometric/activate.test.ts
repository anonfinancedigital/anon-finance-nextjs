import { describe, expect, it, vi } from "vitest";
import { toBase64Url } from "../crypto/base64url";
import { activateBiometric } from "./activate";

const CHALLENGE = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const RAW_ID = Uint8Array.from([250, 251, 252, 253, 254, 255, 1, 2, 3]);
const randomBytes = () => CHALLENGE;

function credentialsWith(result: () => Promise<unknown>) {
  return { create: vi.fn(result), get: vi.fn() } as unknown as Pick<CredentialsContainer, "create" | "get"> & {
    create: ReturnType<typeof vi.fn>;
  };
}

function storeReturning(saved: boolean) {
  return { save: vi.fn((_userId: string, _credentialId: string) => saved) };
}

describe("activateBiometric", () => {
  it("enrolls with the options of LOCK-03, saves { userId, credentialId } and returns true (INVITE-07)", async () => {
    const credentials = credentialsWith(async () => ({ rawId: RAW_ID.buffer }));
    const store = storeReturning(true);

    const result = await activateBiometric({
      credentials,
      userId: "user-1",
      hostname: "anon.example.com",
      randomBytes,
      store,
    });

    expect(result).toBe(true);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(store.save.mock.calls[0]).toEqual(["user-1", toBase64Url(RAW_ID)]);
    const { publicKey } = credentials.create.mock.calls[0][0];
    expect(publicKey.authenticatorSelection).toEqual({
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "discouraged",
    });
    expect(publicKey.rp).toEqual({ name: "ANON", id: "anon.example.com" });
    expect(publicKey.user.id).toEqual(new TextEncoder().encode("user-1"));
    expect(publicKey.challenge).toEqual(CHALLENGE);
    expect(publicKey.timeout).toBe(60000);
  });

  it.each([
    ["rejection", () => Promise.reject(new Error("boom"))],
    ["cancellation", () => Promise.reject(new DOMException("cancelled", "NotAllowedError"))],
    ["null credential", async () => null],
  ])("returns false and saves nothing on %s (INVITE-08)", async (_name, result) => {
    const store = storeReturning(true);
    const credentials = credentialsWith(result);
    expect(await activateBiometric({ credentials, userId: "user-1", hostname: "h", randomBytes, store })).toBe(false);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("returns false when the record cannot be saved (INVITE-08)", async () => {
    const credentials = credentialsWith(async () => ({ rawId: RAW_ID.buffer }));
    const store = storeReturning(false);
    expect(await activateBiometric({ credentials, userId: "user-1", hostname: "h", randomBytes, store })).toBe(false);
    expect(store.save).toHaveBeenCalledTimes(1);
  });
});
