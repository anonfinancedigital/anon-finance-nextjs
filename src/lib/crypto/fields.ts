/** Converts a field value to the plaintext that gets sealed, and back. */
export interface Codec<T> {
  encode(value: T): string;
  decode(text: string): T;
}

const CANONICAL_INTEGER = /^(0|-?[1-9]\d*)$/;

const integerCodec: Codec<number> = {
  encode(value) {
    if (!Number.isSafeInteger(value)) throw new Error("Not an integer");
    return String(value);
  },
  decode(text) {
    const value = Number(text);
    if (!CANONICAL_INTEGER.test(text) || !Number.isSafeInteger(value)) throw new Error("Not a canonical integer");
    return value;
  },
};

export const centsCodec = integerCodec;
export const microCodec = integerCodec;
export const intCodec = integerCodec;

export const textCodec: Codec<string> = {
  encode: (value) => value,
  decode: (text) => text,
};

function assertIsoDate(text: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const date = match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])) : null;
  if (!date || date.toISOString().slice(0, 10) !== text) throw new Error("Not an AAAA-MM-DD date");
  return text;
}

export const dateCodec: Codec<string> = { encode: assertIsoDate, decode: assertIsoDate };

/** Seals a value, keeping `null` as `null` (no ciphertext). */
export function sealNullable<T>(value: T | null, seal: (value: T) => Promise<string>): Promise<string | null> {
  return value === null ? Promise.resolve(null) : seal(value);
}

/** Opens a ciphertext, keeping `null` as `null`. */
export function openNullable<T>(ct: string | null, open: (ct: string) => Promise<T>): Promise<T | null> {
  return ct === null ? Promise.resolve(null) : open(ct);
}
