"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { isGoogleEnabled } from "@/lib/google";
import { logActionError } from "@/lib/log";

const GOOGLE_UNAVAILABLE = "Login com Google indisponível";

/**
 * Starts the Google OAuth flow and sends the browser to Google. Navigation leaves through a Server
 * Action redirect, not a form post, so the CSP `form-action 'self'` is not involved. Google sign-in
 * never touches `login_attempt`: the password lock does not apply to it.
 */
export async function signInGoogleAction(): Promise<ActionResult> {
  if (!isGoogleEnabled()) return { ok: false, error: GOOGLE_UNAVAILABLE };

  let url: string | undefined;
  try {
    const result = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login" },
      headers: await headers(),
    });
    url = result.url;
  } catch (error) {
    logActionError("signInGoogleAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  if (!url) return { ok: false, error: SAVE_FAILED };
  redirect(url);
}
