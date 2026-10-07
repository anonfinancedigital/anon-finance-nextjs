"use server";

import { APIError } from "better-auth/api";
import { verifyPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { usersRepo } from "@/lib/db/repos/users";
import { LOGIN_BLOCK_MESSAGE } from "@/lib/domain/user-status";
import { signupSchema } from "@/lib/validation/signup";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const INVALID_CREDENTIALS = "E-mail ou senha inválidos";
const DUPLICATE_EMAIL = "Este e-mail já está cadastrado";

/**
 * Minutes until the e-mail is released, or 0 when it is not locked.
 * The lock starts at the failure that completed 5 failures within 15 minutes and lasts 15 minutes.
 * Attempts made while locked are not recorded, so that failure is always the latest one.
 */
async function lockedMinutes(email: string): Promise<number> {
  const latest = await loginAttemptsRepo.latestFailure(email);
  if (!latest) return 0;

  const releaseAt = latest.getTime() + WINDOW_MS;
  const now = Date.now();
  if (releaseAt <= now) return 0;

  const failures = await loginAttemptsRepo.countRecentFailures(
    email,
    new Date(latest.getTime() - WINDOW_MS),
  );
  if (failures < MAX_FAILURES) return 0;
  return Math.ceil((releaseAt - now) / 60_000);
}

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

/** Signup form action (useActionState): creates a pending user, with no session. */
export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? undefined,
  });
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const { name, email, password } = parsed.data;
    const result = await usersRepo.createPending({ name, email, password });
    if (!result.ok) return { ok: false, error: DUPLICATE_EMAIL, fieldErrors: { email: DUPLICATE_EMAIL } };
  } catch (error) {
    console.error("signUpAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
