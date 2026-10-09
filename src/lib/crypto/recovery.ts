const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32
const KEY_BYTES = 16;
const KEY_CHARS = 26; // ceil(128 / 5)

/** The typed recovery key has an invalid character or the wrong length. */
export class InvalidRecoveryKey extends Error {
  constructor() {
    super("Invalid recovery key");
    this.name = "InvalidRecoveryKey";
  }
}

function encode(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

/** 128 random bits, shown once as 26 Crockford characters in groups of 4. */
export function generateRecoveryKey(): { display: string; bytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const display = encode(bytes).match(/.{1,4}/g)!.join("-");
  return { display, bytes };
}

/** Reads a typed key: ignores case, spaces and '-'; reads I/L as 1 and O as 0. */
export function parseRecoveryKey(text: string): Uint8Array {
  const chars = text
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (chars.length !== KEY_CHARS) throw new InvalidRecoveryKey();

  const out = new Uint8Array(KEY_BYTES);
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of chars) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new InvalidRecoveryKey();
    buffer = ((buffer << 5) | value) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  return out;
}

/** Recovery key bytes → non-extractable AES-GCM KEK (HKDF-SHA256, info `orcamento/recovery/v1`). */
export async function recoveryKek(bytes: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new Uint8Array(bytes), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: new TextEncoder().encode("orcamento/recovery/v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
