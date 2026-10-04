"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const INVALID_CREDENTIALS = "E-mail ou senha inválidos";

/** Minutes until the e-mail is released, or 0 when it is not locked. */
async function lockedMinutes(email: string): Promise<number> {
  const now = Date.now();
  const since = new Date(now - WINDOW_MS);
  const failures = await loginAttemptsRepo.countRecentFailures(email, since);
  if (failures < MAX_FAILURES) return 0;

  const oldest = await loginAttemptsRepo.oldestRecentFailure(email, since);
  const releaseAt = (oldest?.getTime() ?? now) + WINDOW_MS;
  return Math.max(1, Math.ceil((releaseAt - now) / 60_000));
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
    return { ok: false, error: `Muitas tentativas. Tente novamente em ${minutes} minutos` };
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

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
