import { createHmac } from "node:crypto";

/** The client IP from the proxy headers: first `x-forwarded-for` item, else `x-real-ip`; null if none. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

/** HMAC-SHA-256 hex of the IP keyed by `BETTER_AUTH_SECRET`; throws without the key. */
export function hashIp(ip: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required to hash the IP");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
