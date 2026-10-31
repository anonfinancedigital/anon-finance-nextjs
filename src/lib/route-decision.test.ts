import { describe, expect, it } from "vitest";
import { decideRoute } from "./route-decision";

describe("decideRoute", () => {
  it("serves the landing at / to visitors, keeping the URL (PRIV-15)", () => {
    expect(decideRoute("/", false)).toEqual({
      action: "rewrite",
      to: "/bem-vindo",
      noStore: true,
    });
  });

  it("serves the app at / to signed-in users (PRIV-15)", () => {
    expect(decideRoute("/", true)).toEqual({ action: "next", noStore: true });
  });

  it("serves the public privacy page to visitors (PRIV-01)", () => {
    expect(decideRoute("/privacidade", false)).toEqual({
      action: "next",
      noStore: false,
    });
  });

  it("rewrites /privacidade to the app-shell page for signed-in users (PRIV-07, PRIV-08)", () => {
    expect(decideRoute("/privacidade", true)).toEqual({
      action: "rewrite",
      to: "/seguranca",
      noStore: true,
    });
  });

  it("does not rewrite sub-paths of /privacidade (edge case)", () => {
    expect(decideRoute("/privacidade/x", true)).toEqual({
      action: "next",
      noStore: false,
    });
  });

  it("sends visitors from /seguranca to /login (PRIV-14)", () => {
    expect(decideRoute("/seguranca", false)).toEqual({
      action: "redirect",
      to: "/login",
      noStore: true,
    });
  });

  it("lets signed-in users reach /seguranca directly (PRIV-14)", () => {
    expect(decideRoute("/seguranca", true)).toEqual({
      action: "next",
      noStore: true,
    });
  });

  it("sends visitors from other protected paths to /login (PRIV-15)", () => {
    expect(decideRoute("/categorias", false)).toEqual({
      action: "redirect",
      to: "/login",
      noStore: true,
    });
  });

  it.each(["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/bem-vindo"])(
    "keeps %s public for both visitors and signed-in users (PRIV-15)",
    (path) => {
      expect(decideRoute(path, false)).toEqual({
        action: "next",
        noStore: false,
      });
      expect(decideRoute(path, true)).toEqual({
        action: "next",
        noStore: false,
      });
    },
  );

  it.each(["/sentry-example-page", "/api/sentry-example-api"])(
    "lets the Sentry example route %s through without a session or a login redirect (SENTRY-22)",
    (path) => {
      expect(decideRoute(path, false)).toEqual({ action: "next", noStore: false });
    },
  );

  it("lets anonymous visitors reach /api/health without a redirect (HOSTING-06)", () => {
    expect(decideRoute("/api/health", false)).toEqual({ action: "next", noStore: false });
  });

  it("only matches /api/health exactly or as a prefix segment (HOSTING-09)", () => {
    for (const path of ["/api/healthz", "/api/health-x"]) {
      expect(decideRoute(path, false)).toEqual({ action: "redirect", to: "/login", noStore: true });
    }
  });

  it("keeps protected routes redirecting anonymous visitors to /login (HOSTING-09)", () => {
    expect(decideRoute("/transacoes", false)).toEqual({ action: "redirect", to: "/login", noStore: true });
  });

  it("lets anonymous callers reach /api/push/dispatch without a redirect (PUSH-22)", () => {
    expect(decideRoute("/api/push/dispatch", false)).toEqual({ action: "next", noStore: false });
  });

  it("only matches /api/push/dispatch exactly or as a prefix segment, keeping the rest redirecting (PUSH-32)", () => {
    for (const path of ["/api/push/dispatch-x", "/api/push", "/api/healthz"]) {
      expect(decideRoute(path, false)).toEqual({ action: "redirect", to: "/login", noStore: true });
    }
  });
});
