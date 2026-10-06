"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { isAdminEmail } from "@/lib/admin";
import { requireAdminForAction } from "@/lib/auth-guard";
import { usersRepo } from "@/lib/db/repos/users";
import type { UserAction } from "@/lib/domain/user-status";

const ADMIN_PATH = "/admin/cadastros";
const NOT_FOUND = "Cadastro não encontrado";
const NOT_PENDING = "Este cadastro não está pendente";
const NOT_APPROVED = "Este usuário não está aprovado";
const ADMIN_TARGET = "Não é possível revogar ou excluir o administrador";

async function isAdminTarget(id: string): Promise<boolean> {
  const target = await usersRepo.findById(id);
  return target !== null && isAdminEmail(target.email);
}

/** Applies the admin decision; rejecting and revoking also end the user's sessions. */
async function decide(id: string, action: UserAction): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  if (!admin.ok) return admin;

  try {
    if (action === "revoke" && (await isAdminTarget(id))) return { ok: false, error: ADMIN_TARGET };
    const result = await usersRepo.transition(id, action);
    if (result === "not_found") return { ok: false, error: NOT_FOUND };
    // Approving an approved user is a no-op `ok`, so only reject and revoke reach the wrong state.
    if (result === "wrong_state") {
      return { ok: false, error: action === "revoke" ? NOT_APPROVED : NOT_PENDING };
    }
    if (action !== "approve") await usersRepo.revokeSessions(id);
  } catch (error) {
    console.error(`${action}User`, error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/** Approves a pending, rejected or revoked user. */
export async function approveUser(id: string): Promise<ActionResult> {
  return decide(id, "approve");
}

/** Rejects a pending user and ends its sessions. */
export async function rejectUser(id: string): Promise<ActionResult> {
  return decide(id, "reject");
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
    console.error("deleteUser", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
