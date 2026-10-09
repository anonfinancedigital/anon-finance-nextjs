import { DecryptError } from "@/lib/crypto/aead";
import { fromBase64Url } from "@/lib/crypto/base64url";
import { deriveKeys, type KdfParams } from "@/lib/crypto/kdf";
import { unwrapDek } from "@/lib/crypto/wrap";
import type { Ct } from "./types";

/** The password does not open the wrapped DEK. */
export class WrongPasswordError extends Error {
  constructor() {
    super("Wrong password");
    this.name = "WrongPasswordError";
  }
}

/** The login secret the browser sends in place of the password (SIGILO-13). */
export async function deriveLoginSecret(password: string, params: KdfParams, salt: string): Promise<string> {
  return (await deriveKeys(password, fromBase64Url(salt), params)).authSecret;
}

/** Derives the KEK from the password and unwraps the DEK into a non-extractable key. */
export async function unlockVault(input: {
  password: string;
  params: KdfParams;
  salt: string;
  dekWrappedPw: Ct;
  userId: string;
}): Promise<CryptoKey> {
  const { kek } = await deriveKeys(input.password, fromBase64Url(input.salt), input.params);
  let dekRaw: Uint8Array;
  try {
    dekRaw = await unwrapDek(kek, input.dekWrappedPw, input.userId);
  } catch (error) {
    if (error instanceof DecryptError) throw new WrongPasswordError();
    throw error;
  }
  const raw = new Uint8Array(dekRaw);
  try {
    return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  } finally {
    raw.fill(0);
    dekRaw.fill(0);
  }
}
