import { DecryptError, decryptField, encryptField } from "./aead";
import { fromBase64Url, toBase64Url } from "./base64url";

const DEK_BYTES = 32;
const dekAad = (userId: string) => `vault.dek.${userId}`;

/** Seals the raw DEK under a KEK (AES-GCM, AAD `vault.dek.<userId>`); returns `v1:...`. */
export function wrapDek(kek: CryptoKey, dekRaw: Uint8Array, userId: string): Promise<string> {
  return encryptField(kek, toBase64Url(dekRaw), dekAad(userId));
}

/** Opens a wrapped DEK; throws `DecryptError` on wrong KEK, wrong user or a malformed payload. */
export async function unwrapDek(kek: CryptoKey, wrapped: string, userId: string): Promise<Uint8Array> {
  const text = await decryptField(kek, wrapped, dekAad(userId));
  try {
    const dek = fromBase64Url(text);
    if (dek.length === DEK_BYTES) return dek;
  } catch {
    // falls through to DecryptError
  }
  throw new DecryptError();
}
