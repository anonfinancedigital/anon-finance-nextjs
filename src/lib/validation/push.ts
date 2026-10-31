import { z } from "zod";

const ENDPOINT_ERROR = "Este navegador não é compatível com notificações";
const KEY_ERROR = "Inscrição inválida";
const PREFS_ERROR = "Preferências inválidas";
const BROADCAST_ERROR = "A mensagem deve ter de 1 a 140 caracteres";

const EXACT_HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com"]);
const HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

/**
 * Only the push services of the main browsers. The endpoint comes from the client and the server POSTs to it,
 * so anything else (other hosts, IPs, ports, credentials, plain http) would be an SSRF hole.
 */
export function isAllowedPushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  return EXACT_HOSTS.has(url.hostname) || HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
}

/** Decodes unpadded base64url, or `null` when the text is not base64url. */
function decodeBase64Url(input: string): Buffer | null {
  return /^[A-Za-z0-9_-]+$/.test(input) ? Buffer.from(input, "base64url") : null;
}

const p256dh = z.string({ error: KEY_ERROR }).refine((value) => {
  const bytes = decodeBase64Url(value);
  return bytes !== null && bytes.length === 65 && bytes[0] === 0x04;
}, KEY_ERROR);

const auth = z.string({ error: KEY_ERROR }).refine((value) => decodeBase64Url(value)?.length === 16, KEY_ERROR);

export const subscriptionSchema = z.object({
  endpoint: z.string({ error: ENDPOINT_ERROR }).refine(isAllowedPushEndpoint, ENDPOINT_ERROR),
  p256dh,
  auth,
});

const flag = z.boolean({ error: PREFS_ERROR });

export const preferencesSchema = z.object({
  reminder: flag,
  due: flag,
  security: flag,
  admin: flag,
  hour: z.number({ error: PREFS_ERROR }).int(PREFS_ERROR).min(0, PREFS_ERROR).max(23, PREFS_ERROR),
});

export const broadcastSchema = z
  .string({ error: BROADCAST_ERROR })
  .trim()
  .min(1, BROADCAST_ERROR)
  .max(140, BROADCAST_ERROR);
