import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { decideRoute } from "@/lib/route-decision";
import { buildCsp } from "@/lib/security-headers";

/**
 * Runs on every page (public ones too) so that all of them get a per-request CSP nonce.
 * Optimistic check only (UX): the routing decision (login redirect, landing and privacy frames) is in `decideRoute`.
 * The real access control is requireSession* in every page and action.
 */
export function proxy(request: NextRequest) {
  const decision = decideRoute(request.nextUrl.pathname, Boolean(getSessionCookie(request)));
  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.to, request.url));

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the CSP header of the request while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response =
    decision.action === "rewrite"
      ? NextResponse.rewrite(new URL(decision.to, request.url), {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (decision.noStore) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    // Everything except Better Auth routes, Next assets and public images.
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
