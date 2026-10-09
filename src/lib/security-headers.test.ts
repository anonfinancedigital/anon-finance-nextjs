import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "./security-headers";

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

  it("embeds a different nonce for each call", () => {
    expect(buildCsp("a", false)).toContain("'nonce-a'");
    expect(buildCsp("b", false)).not.toContain("'nonce-a'");
  });
});
