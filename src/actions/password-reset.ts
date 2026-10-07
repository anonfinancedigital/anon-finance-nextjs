"use server";

import { after } from "next/server";
import { type ActionResult, invalidInput } from "@/lib/action-result";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { buildPasswordResetEmail } from "@/lib/domain/password-reset-email";
import { sendMail } from "@/lib/mailer";
import { requestResetSchema } from "@/lib/validation/password-reset";

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
