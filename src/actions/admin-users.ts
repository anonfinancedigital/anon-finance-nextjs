"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { isAdminEmail } from "@/lib/admin";
import { requireAdminForAction } from "@/lib/auth-guard";
import { usersRepo } from "@/lib/db/repos/users";
import type { UserAction } from "@/lib/domain/user-status";
import { logActionError } from "@/lib/log";
import { notifySecurity } from "@/lib/push/security";

const ADMIN_PATH = "/admin/cadastros";
const NOT_FOUND = "Cadastro não encontrado";
const NOT_REVOKED = "Este usuário não está revogado";
const NOT_APPROVED = "Este usuário não está aprovado";
const ADMIN_TARGET = "Não é possível revogar ou excluir o administrador";

async function isAdminTarget(id: string): Promise<boolean> {
  const target = await usersRepo.findById(id);
  return target !== null && isAdminEmail(target.email);
}

/** Applies the admin decision; revoking also ends the user's sessions, all or nothing. */
async function decide(id: string, action: UserAction): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin.ok) return admin;

  try {
    if (action === "revoke" && (await isAdminTarget(id))) return { ok: false, error: ADMIN_TARGET };
    const result = await usersRepo.transition(id, action, { revokeSessions: action === "revoke" });
    if (result === "not_found") return { ok: false, error: NOT_FOUND };
    // Reactivating an approved user is a no-op `ok`, so only a pending or rejected one reaches the wrong state.
    if (result === "wrong_state") {
      return { ok: false, error: action === "revoke" ? NOT_APPROVED : NOT_REVOKED };
    }
  } catch (error) {
    logActionError(`${action}User`, error);
    return { ok: false, error: SAVE_FAILED };
  }

  // The revocation is already committed: a failed notice is logged and never changes the result (PUSH-35).
  if (action === "revoke") {
    await notifySecurity(id, "revoked").catch((error) => logActionError("revokeUser", error));
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/** Reactivates a revoked user; its data and vault were kept. */
export async function reactivateUser(id: string): Promise<ActionResult> {
  return decide(id, "reactivate");
}

/** Revokes an approved user and ends its sessions, keeping its data. */
export async function revokeUser(id: string): Promise<ActionResult> {
  return decide(id, "revoke");
}

/** Deletes a user in any status with all its data, freeing the e-mail. */
export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin.ok) return admin;

  try {
    if (await isAdminTarget(id)) return { ok: false, error: ADMIN_TARGET };
    if ((await usersRepo.remove(id)) === "not_found") return { ok: false, error: NOT_FOUND };
  } catch (error) {
    logActionError("deleteUser", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
