"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { buildPasswordResetEmail } from "@/lib/domain/password-reset-email";
import { sendMail } from "@/lib/mailer";
import {
  INVALID_LINK_MESSAGE,
  requestResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/password-reset";

/**
 * Reset request form action (useActionState). Any well-formed e-mail gets `{ ok: true }`, whether an
 * e-mail goes out or not. Only an approved account gets one, sent after the response so the answer
 * takes the same time; delivery and database failures go to the server log only.
 */
export async function requestPasswordResetAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const issued = await passwordResetsRepo.issue(parsed.data.email);
    if (issued) {
      const message = buildPasswordResetEmail({
        to: issued.email,
        token: issued.token,
        baseUrl: process.env.BETTER_AUTH_URL ?? "",
      });
      after(() =>
        sendMail(message).catch((error) => console.error("requestPasswordResetAction: sendMail", error)),
      );
    }
  } catch (error) {
    console.error("requestPasswordResetAction", error);
  }
  return { ok: true };
}

/**
 * New password form action (useActionState): consumes the token, replaces the password, ends every
 * session and redirects to /login without opening one. A failure keeps the token valid.
 */
export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? undefined,
  });
  if (!parsed.success) return invalidInput(parsed.error);

  let outcome: "ok" | "invalid";
  try {
    outcome = await passwordResetsRepo.consume(parsed.data.token, parsed.data.password);
  } catch (error) {
    console.error("resetPasswordAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  if (outcome === "invalid") return { ok: false, error: INVALID_LINK_MESSAGE };
  redirect("/login");
}
