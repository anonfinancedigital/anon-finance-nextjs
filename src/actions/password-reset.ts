"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  type ActionResult,
  invalidInput,
  SAVE_FAILED,
} from "@/lib/action-result";
import { resolveBaseUrl } from "@/lib/base-url";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { buildPasswordResetEmail } from "@/lib/domain/password-reset-email";
import { logActionError } from "@/lib/log";
import { sendMail } from "@/lib/mailer";
import { notifySecurity } from "@/lib/push/security";
import {
  INVALID_LINK_MESSAGE,
  requestResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/password-reset";
import {
  type ResetPasswordSealedPayload,
  resetPasswordSealedSchema,
} from "@/lib/validation/password-reset-sealed";

/**
 * Reset request form action (useActionState). Any well-formed e-mail gets `{ ok: true }`, whether an
 * e-mail goes out or not. Only an approved account gets one, sent after the response so the answer
 * takes the same time; delivery and database failures go to the server log only.
 */
export async function requestPasswordResetAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email") ?? "",
  });
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const issued = await passwordResetsRepo.issue(parsed.data.email);
    if (issued) {
      const baseUrl = resolveBaseUrl(
        process.env.BETTER_AUTH_URL,
        process.env.NODE_ENV,
      );
      if (baseUrl === null) {
        // Uniform answer (no hint whether the account exists); the failure shows up in the log and Sentry.
        logActionError("requestPasswordResetAction: baseUrl", null);
        return { ok: true };
      }
      const message = buildPasswordResetEmail({
        to: issued.email,
        token: issued.token,
        baseUrl,
      });
      after(() =>
        sendMail(message).catch((error) =>
          logActionError("requestPasswordResetAction: sendMail", error),
        ),
      );
    }
  } catch (error) {
    logActionError("requestPasswordResetAction", error);
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
  let ownerId: string | undefined;
  try {
    // Read before consuming: the consumed token no longer names its owner.
    ownerId = (await passwordResetsRepo.recoveryMaterialFor(parsed.data.token))?.userId;
    outcome = await passwordResetsRepo.consume(
      parsed.data.token,
      parsed.data.password,
    );
  } catch (error) {
    logActionError("resetPasswordAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  if (outcome === "invalid") return { ok: false, error: INVALID_LINK_MESSAGE };
  // Before the redirect, which throws.
  if (ownerId) await notifyPasswordReset(ownerId);
  redirect("/login");
}

/** The reset is already done: a failed notice is logged and never changes the result (PUSH-35). */
async function notifyPasswordReset(userId: string): Promise<void> {
  await notifySecurity(userId, "password_reset").catch((error) =>
    logActionError("notifySecurity", error),
  );
}

/**
 * The token owner's id and recovery-wrapped DEK, for the browser to unwrap with the recovery key
 * (SIGILO-19); the id is part of the wrap's AAD and of a new vault's. It is not secret: the token's
 * owner owns the e-mail. Nothing else leaves the server, and the token is not consumed.
 * An owner without a vault yet (legacy account) gets `{ ok: true, legacy: true }`: their data is
 * still on the server, so they reset with `resetPasswordAction` and migrate after signing in.
 */
export async function getResetVaultAction(
  token: string,
): Promise<
  | { ok: true; legacy?: false; userId: string; dekWrappedRecovery: string }
  | { ok: true; legacy: true }
  | { ok: false; error: string }
> {
  if (typeof token !== "string" || token === "")
    return { ok: false, error: INVALID_LINK_MESSAGE };
  try {
    const material = await passwordResetsRepo.recoveryMaterialFor(token);
    if (material === null) return { ok: false, error: INVALID_LINK_MESSAGE };
    if (material.dekWrappedRecovery === null) return { ok: true, legacy: true };
    return {
      ok: true,
      userId: material.userId,
      dekWrappedRecovery: material.dekWrappedRecovery,
    };
  } catch (error) {
    logActionError("getResetVaultAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

/**
 * Sealed reset: consumes the token, replaces the login secret and either rewraps the DEK (`rewrap`)
 * or erases the financial data and stores a new vault (`wipe`), all in one transaction, ending every
 * session. No redirect: after `wipe` the browser still has to show the new recovery key once.
 * A malformed payload or a failure keeps the token valid.
 */
export async function resetPasswordSealedAction(
  payload: ResetPasswordSealedPayload,
): Promise<ActionResult> {
  const parsed = resetPasswordSealedSchema.safeParse(payload);
  if (!parsed.success) return invalidInput(parsed.error);

  const { token, ...input } = parsed.data;
  let outcome: "ok" | "invalid";
  let ownerId: string | undefined;
  try {
    ownerId = (await passwordResetsRepo.recoveryMaterialFor(token))?.userId;
    outcome = await passwordResetsRepo.consumeSealed(token, input);
  } catch (error) {
    logActionError("resetPasswordSealedAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  if (outcome === "invalid") return { ok: false, error: INVALID_LINK_MESSAGE };
  if (ownerId) await notifyPasswordReset(ownerId);
  return { ok: true };
}
