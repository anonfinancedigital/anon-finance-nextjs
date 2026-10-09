export type Header = { key: string; value: string };

/**
 * Static security headers sent on every response (SIGILO-27).
 * HSTS only in production: in development it would pin localhost to HTTPS.
 */
export function securityHeaders(env: { NODE_ENV?: string }): Header[] {
  const headers: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ];
  if (env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}

/**
 * Content-Security-Policy with a per-request nonce (SIGILO-28). Scripts load only from the own
 * origin or via nonce + strict-dynamic, never from an external origin. `unsafe-eval` is
 * development only (React debugging). Fonts are self-hosted by next/font, so `'self'` suffices.
 * `style-src` keeps `'unsafe-inline'` because React inline `style` attributes need it.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
