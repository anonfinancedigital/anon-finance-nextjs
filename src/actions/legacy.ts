"use server";

import { type ActionResult, SAVE_FAILED, UNAUTHORIZED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { legacyRepo } from "@/lib/db/repos/legacy";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { usersRepo } from "@/lib/db/repos/users";
import { logActionError } from "@/lib/log";
import { lockedMinutes } from "@/lib/login-lock";
import {
  type CommitLegacyMigrationPayload,
  commitLegacyMigrationSchema,
} from "@/lib/validation/legacy";
import type { LegacyPlain } from "@/lib/vault/types";

const NOT_LEGACY = "Esta conta já está protegida";
const WRONG_PASSWORD = "Senha incorreta";

/** The plain-text rows of a legacy account, for the browser to seal (SIGILO-22); an account with a vault gets an error. */
export async function loadLegacyDataAction(): Promise<
  { ok: true; data: LegacyPlain } | Extract<ActionResult, { ok: false }>
> {
  const session = await requireSessionForAction();
  if (!session.ok) return { ok: false, error: UNAUTHORIZED };

  try {
    const result = await legacyRepo.readPlain(session.userId);
    if (!result.ok) return { ok: false, error: NOT_LEGACY };
    return { ok: true, data: result.plain };
  } catch (error) {
    logActionError("loadLegacyDataAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

/**
 * Finishes the migration of a legacy account in one transaction (SIGILO-23/24): seals every row,
 * removes the plain text and swaps the password hash for the login secret's. The old password is
 * checked against the stored hash under the login lock (5 failures in 15 minutes per e-mail; a
 * wrong one counts as a failure, a success clears them). A malformed or incomplete package changes nothing.
 */
export async function commitLegacyMigrationAction(payload: CommitLegacyMigrationPayload): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = commitLegacyMigrationSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: SAVE_FAILED };

  const { oldPassword, authSecret, vault, pkg } = parsed.data;
  try {
    const owner = await usersRepo.findById(session.userId);
    if (!owner) return { ok: false, error: UNAUTHORIZED };

    const minutes = await lockedMinutes(owner.email);
    if (minutes > 0) {
      const unit = minutes === 1 ? "minuto" : "minutos";
      return { ok: false, error: `Muitas tentativas. Tente novamente em ${minutes} ${unit}` };
    }

    const outcome = await legacyRepo.commitMigration(session.userId, oldPassword, { ...pkg, authSecret, vault });
    if (outcome === "wrong_password") {
      await loginAttemptsRepo.recordFailure(owner.email);
      return { ok: false, error: WRONG_PASSWORD };
    }
    if (outcome === "not_legacy") return { ok: false, error: NOT_LEGACY };
    if (outcome === "mismatch") return { ok: false, error: SAVE_FAILED };
    await loginAttemptsRepo.clear(owner.email);
  } catch (error) {
    logActionError("commitLegacyMigrationAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
  return { ok: true };
}
