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
  // Dev-only allowance so impeccable live mode can load.
  const __impeccableLiveDev = isDev ? " http://localhost:8400" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}${__impeccableLiveDev}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${__impeccableLiveDev}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * CSP for the responses the proxy does not run on (Better Auth API, Next assets, images): none of
 * them is a page, so nothing may load, frame them or embed plugins (SIGILO-28 on every response).
 */
export const STATIC_CSP = "default-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

/**
 * Paths excluded by the proxy matcher (`src/proxy.ts`), in `next.config` `source` syntax. Pages are
 * never among them, so they keep only the per-request nonce CSP set by the proxy.
 */
export const PATHS_OUTSIDE_PROXY = [
  "/api/auth/:path*",
  "/monitoring/:path*",
  "/_next/static/:path*",
  "/_next/image",
  "/favicon.ico",
  "/:path(.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico))",
];

export type HeaderRule = { source: string; headers: Header[] };

/** Rules for `next.config` `headers()`: the static headers everywhere, the static CSP off-proxy. */
export function securityHeaderRules(env: { NODE_ENV?: string }): HeaderRule[] {
  return [
    { source: "/:path*", headers: securityHeaders(env) },
    ...PATHS_OUTSIDE_PROXY.map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: STATIC_CSP }],
    })),
  ];
}
