import { argon2idAsync } from "@noble/hashes/argon2.js";
import { toBase64Url } from "./base64url";

/** Argon2id cost: memory in KiB, iterations, parallelism. */
export interface KdfParams {
  m: number;
  t: number;
  p: number;
}

export const DEFAULT_KDF_PARAMS: KdfParams = { m: 65536, t: 3, p: 1 };

const encoder = new TextEncoder();

/**
 * Password → Argon2id (32 bytes) → HKDF-SHA256 into two independent outputs:
 * the login secret sent to the server and the non-extractable KEK that never leaves the browser.
 */
export async function deriveKeys(
  password: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<{ authSecret: string; kek: CryptoKey }> {
  // asyncTick yields to the event loop so the UI stays responsive during the slow hash.
  const ikm = await argon2idAsync(password, salt, { ...params, dkLen: 32, asyncTick: 10 });
  const base = await crypto.subtle.importKey("raw", new Uint8Array(ikm), "HKDF", false, ["deriveBits", "deriveKey"]);
  const hkdf = (info: string) => ({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(info) });

  const authBits = await crypto.subtle.deriveBits(hkdf("orcamento/auth/v1"), base, 256);
  const kek = await crypto.subtle.deriveKey(hkdf("orcamento/kek/v1"), base, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  return { authSecret: toBase64Url(new Uint8Array(authBits)), kek };
}
