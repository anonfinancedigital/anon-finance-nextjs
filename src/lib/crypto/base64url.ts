const ALPHABET = /^[A-Za-z0-9_-]*$/;

/** Encodes bytes as base64url without padding (RFC 4648 §5). */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes unpadded base64url; throws on any character outside the alphabet or an impossible length. */
export function fromBase64Url(text: string): Uint8Array {
  if (!ALPHABET.test(text) || text.length % 4 === 1) throw new Error("Invalid base64url");
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
