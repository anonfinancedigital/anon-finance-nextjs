import { fromBase64Url, toBase64Url } from "./base64url";

const PREFIX = "v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Any failure to open a sealed value: wrong key, wrong AAD, tampered bytes or malformed text. */
export class DecryptError extends Error {
  constructor() {
    super("Decrypt failed");
    this.name = "DecryptError";
  }
}

/** Authenticated context of a field: `table.column.userId[.rowId]`. */
export function aad(table: string, column: string, userId: string, rowId?: string): string {
  return [table, column, userId, rowId].filter((part) => part !== undefined).join(".");
}

/** AES-256-GCM with a random 12-byte IV per call; returns `v1:<base64url(iv‖ct‖tag)>`. */
export async function encryptField(dek: CryptoKey, plaintext: string, aadText: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aadText) },
    dek,
    new TextEncoder().encode(plaintext),
  );
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv);
  out.set(new Uint8Array(sealed), IV_BYTES);
  return PREFIX + toBase64Url(out);
}

/** Opens a value from `encryptField`; throws `DecryptError` on any failure. */
export async function decryptField(dek: CryptoKey, ct: string, aadText: string): Promise<string> {
  try {
    if (!ct.startsWith(PREFIX)) throw new DecryptError();
    const bytes = fromBase64Url(ct.slice(PREFIX.length));
    if (bytes.length < IV_BYTES + TAG_BYTES) throw new DecryptError();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, IV_BYTES), additionalData: new TextEncoder().encode(aadText) },
      dek,
      bytes.slice(IV_BYTES),
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    throw new DecryptError();
  }
}
