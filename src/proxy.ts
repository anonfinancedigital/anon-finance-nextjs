import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { buildCsp } from "@/lib/security-headers";

const PUBLIC_PATHS = [
  "/bem-vindo",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
  "/privacidade",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Runs on every page (public ones too) so that all of them get a per-request CSP nonce.
 * Optimistic check only (UX): sends visitors without a session cookie to /login when the page is protected.
 * The real access control is requireSession* in every page and action.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoute = !isPublic(pathname);
  const hasSession = Boolean(getSessionCookie(request));
  // Visitors at the root see the landing page (URL stays `/`); other protected pages still go to /login.
  const showLanding = pathname === "/" && !hasSession;
  if (protectedRoute && !hasSession && !showLanding) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the CSP header of the request while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = showLanding
    ? NextResponse.rewrite(new URL("/bem-vindo", request.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (protectedRoute) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    // Everything except Better Auth routes, Next assets and public images.
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
