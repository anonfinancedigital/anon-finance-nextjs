import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { describe, expect, it } from "vitest";
import { PATHS_OUTSIDE_PROXY } from "@/lib/security-headers";
import { config } from "./proxy";

const proxyRuns = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);
const outsideProxy = (path: string) =>
  PATHS_OUTSIDE_PROXY.some((source) => getPathMatch(source, { strict: true, removeUnnamedParams: true })(path) !== false);

describe("proxy matcher (PWA-05, PWA-06)", () => {
  it.each(["/manifest.webmanifest", "/sw.js", "/offline.html"])("does not run on the PWA file %s", (path) => {
    expect(proxyRuns(path)).toBe(false);
  });

  it.each(["/", "/conta", "/api/push/dispatch", "/sw.json"])("still runs on %s", (path) => {
    expect(proxyRuns(path)).toBe(true);
  });

  // One sample per PATHS_OUTSIDE_PROXY entry: adding an entry without a sample here fails the first test.
  const samples: Record<string, string> = {
    "/api/auth/:path*": "/api/auth/get-session",
    "/monitoring/:path*": "/monitoring/envelope",
    "/_next/static/:path*": "/_next/static/chunks/main.js",
    "/_next/image": "/_next/image",
    "/favicon.ico": "/favicon.ico",
    "/manifest.webmanifest": "/manifest.webmanifest",
    "/:path(.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico))": "/icon-192.png",
  };

  it("has a sample for every path outside the proxy", () => {
    expect(Object.keys(samples).sort()).toEqual([...PATHS_OUTSIDE_PROXY].sort());
  });

  it.each(Object.entries(samples))("agrees on %s: outside the proxy and skipped by the matcher", (_source, path) => {
    expect(outsideProxy(path)).toBe(true);
    expect(proxyRuns(path)).toBe(false);
  });

  it("agrees on /sw.js and /offline.html, which have their own header rules instead of the static CSP", () => {
    for (const path of ["/sw.js", "/offline.html"]) {
      expect(proxyRuns(path)).toBe(false);
      expect(outsideProxy(path)).toBe(false);
    }
  });
});
