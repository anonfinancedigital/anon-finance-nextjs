"use server";

import { APIError } from "better-auth/api";
import { verifyPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { clientIp, hashIp } from "@/lib/client-ip";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { signupAttemptsRepo } from "@/lib/db/repos/signup-attempts";
import { usersRepo } from "@/lib/db/repos/users";
import { SIGNUP_WINDOW_MS, signupLockMinutes } from "@/lib/domain/signup-limit";
import { LOGIN_BLOCK_MESSAGE } from "@/lib/domain/user-status";
import { logActionError } from "@/lib/log";
import { lockedMinutes } from "@/lib/login-lock";
import { type SignUpSealedPayload, signUpSealedSchema } from "@/lib/validation/signup-sealed";

const INVALID_CREDENTIALS = "E-mail ou senha inválidos";
const DUPLICATE_EMAIL = "Este e-mail já está cadastrado";

/** Login form action (useActionState): locks the e-mail after 5 failures in 15 minutes. */
export async function signInAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const minutes = await lockedMinutes(email);
  if (minutes > 0) {
    const unit = minutes === 1 ? "minuto" : "minutos";
    return { ok: false, error: `Muitas tentativas. Tente novamente em ${minutes} ${unit}` };
  }

  // A non-approved account reveals its status only to whoever knows the password.
  const account = await usersRepo.findByEmail(email);
  if (account && account.status !== "approved") {
    const correct =
      account.passwordHash !== null &&
      (await verifyPassword({ hash: account.passwordHash, password }));
    if (!correct) {
      await loginAttemptsRepo.recordFailure(email);
      return { ok: false, error: INVALID_CREDENTIALS };
    }
    return { ok: false, error: LOGIN_BLOCK_MESSAGE[account.status] };
  }

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    await loginAttemptsRepo.recordFailure(email);
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  await loginAttemptsRepo.clear(email);
  redirect("/");
}

/**
 * Sealed signup: the browser sends the client-chosen id, name, e-mail, the login secret (stored only
 * as Better Auth's hash), the key material and the sealed birth date. Creates an approved user, with no
 * session. At most 5 signups per IP in 60 minutes; without an IP in the headers there is no limit.
 */
export async function signUpSealedAction(payload: SignUpSealedPayload): Promise<ActionResult> {
  const parsed = signUpSealedSchema.safeParse(payload);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const ip = clientIp(await headers());
    const ipHash = ip ? hashIp(ip) : null;
    if (ipHash) {
      const now = Date.now();
      const minutes = signupLockMinutes(await signupAttemptsRepo.recentSince(ipHash, new Date(now - SIGNUP_WINDOW_MS)), now);
      if (minutes > 0) {
        const unit = minutes === 1 ? "minuto" : "minutos";
        return { ok: false, error: `Muitos cadastros a partir deste endereço. Tente novamente em ${minutes} ${unit}` };
      }
    }

    const { userId, name, email, authSecret, vault, birthDateCt } = parsed.data;
    const result = await usersRepo.createSealed({ id: userId, name, email, authSecret, vault, birthDateCt, ipHash });
    if (!result.ok) return { ok: false, error: DUPLICATE_EMAIL, fieldErrors: { email: DUPLICATE_EMAIL } };
  } catch (error) {
    logActionError("signUpSealedAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
