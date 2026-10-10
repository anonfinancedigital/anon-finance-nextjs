import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import {
  buildCsp,
  PATHS_OUTSIDE_PROXY,
  STATIC_CSP,
  securityHeaderRules,
  securityHeaders,
} from "./security-headers";

const value = (env: string, key: string) =>
  securityHeaders({ NODE_ENV: env }).find((h) => h.key === key)?.value;

describe("securityHeaders", () => {
  it.each(["development", "test", "production"])("always sends the three base headers (%s)", (env) => {
    expect(value(env, "X-Content-Type-Options")).toBe("nosniff");
    expect(value(env, "X-Frame-Options")).toBe("DENY");
    expect(value(env, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sends HSTS only in production", () => {
    expect(value("production", "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(value("development", "Strict-Transport-Security")).toBeUndefined();
    expect(securityHeaders({}).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });
});

describe("buildCsp", () => {
  const directive = (csp: string, name: string) =>
    csp.split("; ").find((d) => d.startsWith(`${name} `) || d === name);

  it("forbids framing, plugins and foreign base URIs", () => {
    const csp = buildCsp("abc", false);
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
  });

  it("limits script-src to self, the nonce and strict-dynamic, with no external origin", () => {
    const script = directive(buildCsp("abc123", false), "script-src");
    expect(script).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(script).not.toMatch(/https?:|\*/);
  });

  it("allows unsafe-eval only in development", () => {
    expect(directive(buildCsp("n", true), "script-src")).toContain("'unsafe-eval'");
    expect(buildCsp("n", false)).not.toContain("unsafe-eval");
  });

  it("keeps style-src to self plus unsafe-inline", () => {
    expect(directive(buildCsp("n", false), "style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });

  it("restricts the remaining fetch directives to the own origin", () => {
    const csp = buildCsp("n", false);
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "img-src")).toBe("img-src 'self' blob: data:");
    expect(directive(csp, "font-src")).toBe("font-src 'self'");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
  });

  it("keeps connect-src at 'self' with no external host, since browser events go through /monitoring (SENTRY-08)", () => {
    const connect = directive(buildCsp("n", false), "connect-src");
    expect(connect).toBe("connect-src 'self'");
    expect(buildCsp("n", false)).not.toMatch(/sentry/i);
  });

  it("embeds a different nonce for each call", () => {
    expect(buildCsp("a", false)).toContain("'nonce-a'");
    expect(buildCsp("b", false)).not.toContain("'nonce-a'");
  });
});

describe("securityHeaderRules", () => {
  it("sends the static headers on every path and the static CSP on the paths outside the proxy", () => {
    expect(securityHeaderRules({ NODE_ENV: "production" })).toEqual([
      { source: "/:path*", headers: securityHeaders({ NODE_ENV: "production" }) },
      ...[
        "/api/auth/:path*",
        "/monitoring/:path*",
        "/_next/static/:path*",
        "/_next/image",
        "/favicon.ico",
        "/:path(.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico))",
      ].map((source) => ({
        source,
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      })),
    ]);
  });

  it("never puts a CSP on the /:path* rule, so pages keep only the proxy nonce CSP", () => {
    const [all] = securityHeaderRules({ NODE_ENV: "production" });
    expect(all.headers.some((h) => h.key === "Content-Security-Policy")).toBe(false);
  });

  // Same options Next uses to match `headers()` sources (server/lib/router-utils/filesystem.js).
  const staticCspCovers = (path: string) =>
    PATHS_OUTSIDE_PROXY.some((source) => getPathMatch(source, { strict: true, removeUnnamedParams: true })(path) !== false);
  const proxyCovers = (path: string) => new RegExp(`^${proxyConfig.matcher[0]}$`).test(path);

  it.each([
    "/",
    "/login",
    "/cadastro",
    "/redefinir-senha",
    "/privacidade",
    "/conta",
    "/lancamentos/novo",
    "/api/outra",
  ])("leaves the page %s to the proxy CSP only", (path) => {
    expect(proxyCovers(path)).toBe(true);
    expect(staticCspCovers(path)).toBe(false);
  });

  it.each([
    "/api/auth/get-session",
    "/api/auth/sign-in/email",
    "/_next/static/chunks/main-abc123.js",
    "/_next/static/css/app.css",
    "/_next/image",
    "/favicon.ico",
    "/icon.svg",
    "/favicon.svg",
    "/img/logo.png",
    "/foto.jpeg",
  ])("covers %s, which the proxy skips, with the static CSP", (path) => {
    expect(proxyCovers(path)).toBe(false);
    expect(staticCspCovers(path)).toBe(true);
  });

  it("keeps the static CSP closed to any fetch, frame, plugin and foreign base URI", () => {
    expect(STATIC_CSP.split("; ")).toEqual([
      "default-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ]);
  });
});
