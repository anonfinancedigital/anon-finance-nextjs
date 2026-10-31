const PUBLIC_PATHS = [
  "/bem-vindo",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
  "/privacidade",
  "/sentry-example-page",
  "/api/sentry-example-api",
  "/api/health",
  "/api/push/dispatch",
];

export type RouteDecision =
  { action: "next"; noStore: boolean } | { action: "redirect" | "rewrite"; to: string; noStore: boolean };

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * What the proxy does with a page request, from the path and whether a session cookie is present (optimistic:
 * the cookie is not validated here). `/` and `/privacidade` have two frames on one URL: visitors get the public
 * one, signed-in users the app shell (`/seguranca`). Any other protected path sends visitors to /login.
 */
export function decideRoute(pathname: string, hasSession: boolean): RouteDecision {
  if (pathname === "/" && !hasSession) return { action: "rewrite", to: "/bem-vindo", noStore: true };
  if (pathname === "/privacidade" && hasSession) return { action: "rewrite", to: "/seguranca", noStore: true };
  const noStore = !isPublic(pathname);
  if (noStore && !hasSession && pathname !== "/") return { action: "redirect", to: "/login", noStore };
  return { action: "next", noStore };
}
