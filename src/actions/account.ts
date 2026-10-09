"use server";

import { verifyPassword } from "better-auth/crypto";
import { type ActionResult, invalidInput, SAVE_FAILED, UNAUTHORIZED } from "@/lib/action-result";
import { isAdminEmail } from "@/lib/admin";
import { requireSessionForAction } from "@/lib/auth-guard";
import { exportRowsSealed } from "@/lib/db/repos/export";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { usersRepo } from "@/lib/db/repos/users";
import { logActionError } from "@/lib/log";
import { lockedMinutes } from "@/lib/login-lock";
import { authSecretSchema } from "@/lib/validation/vault";
import type { ExportPayload } from "@/lib/vault/types";

const ADMIN_TARGET = "Não é possível revogar ou excluir o administrador";
const WRONG_PASSWORD = "Senha incorreta";

/** Every sealed row of the session user (SIGILO-37); without an approved session nothing is read. */
export async function exportDataAction(): Promise<
  { ok: true; data: ExportPayload } | Extract<ActionResult, { ok: false }>
> {
  const session = await requireSessionForAction();
  if (!session.ok) return { ok: false, error: UNAUTHORIZED };

  try {
    return { ok: true, data: await exportRowsSealed(session.userId) };
  } catch (error) {
    logActionError("exportDataAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

/**
 * Deletes the session user's account with all its data, vault and sessions (SIGILO-38 to 40). The
 * login secret is checked against the credential hash; the same lock as the login applies (5
 * failures in 15 minutes) and a wrong one counts as a failure. The administrator is refused.
 */
export async function deleteAccountAction(authSecret: string): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = authSecretSchema.safeParse(authSecret);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const owner = await usersRepo.findById(session.userId);
    if (!owner) return { ok: false, error: UNAUTHORIZED };
    if (isAdminEmail(owner.email)) return { ok: false, error: ADMIN_TARGET };

    const minutes = await lockedMinutes(owner.email);
    if (minutes > 0) {
      const unit = minutes === 1 ? "minuto" : "minutos";
      return { ok: false, error: `Muitas tentativas. Tente novamente em ${minutes} ${unit}` };
    }

    const credential = await usersRepo.findByEmail(owner.email);
    const correct =
      credential?.passwordHash != null &&
      (await verifyPassword({ hash: credential.passwordHash, password: parsed.data }));
    if (!correct) {
      await loginAttemptsRepo.recordFailure(owner.email);
      return { ok: false, error: WRONG_PASSWORD };
    }

    // Sessions, accounts, the vault and every financial row cascade from the user row.
    if ((await usersRepo.remove(owner.id)) === "not_found") return { ok: false, error: UNAUTHORIZED };
  } catch (error) {
    logActionError("deleteAccountAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true };
}
