"use server";

import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { type KdfParamsResult, vaultRepo } from "@/lib/db/repos/vault";
import { logActionError } from "@/lib/log";
import { createVaultPayloadSchema } from "@/lib/validation/create-vault";
import { requestResetSchema } from "@/lib/validation/password-reset";
import type { VaultMaterial } from "@/lib/vault/types";

/** Fixed answer of `getVaultAction` for a legacy account: it has no vault to return. */
const NO_VAULT = "Conta sem cofre";

/**
 * Public: the KDF parameters the login form needs for this e-mail. Unknown and existing e-mails
 * get the same shape (SIGILO-15); a legacy account answers `{ mode: "legacy" }`.
 */
export async function getKdfParamsAction(
  email: string,
): Promise<KdfParamsResult | Extract<ActionResult, { ok: false }>> {
  const parsed = requestResetSchema.safeParse({ email });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    return await vaultRepo.kdfParamsFor(parsed.data.email);
  } catch (error) {
    logActionError("getKdfParamsAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

/** The session user's own key material (salt, KDF parameters, wrapped DEKs); never another user's. */
export async function getVaultAction(): Promise<
  { ok: true; vault: VaultMaterial } | Extract<ActionResult, { ok: false }>
> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  try {
    const vault = await vaultRepo.get(session.userId);
    if (!vault) return { ok: false, error: NO_VAULT };
    return { ok: true, vault };
  } catch (error) {
    logActionError("getVaultAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

const VAULT_EXISTS = "Esta conta já tem um cofre";

/**
 * Creates the vault of the session user that needs one (Google-only account). Receives only wrapped
 * keys and the sealed birth date; all or nothing. A user that already has a vault is refused.
 */
export async function createVaultAction(payload: unknown): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = createVaultPayloadSchema.safeParse(payload);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const outcome = await vaultRepo.createForSession(session.userId, parsed.data.vault, parsed.data.birthDateCt);
    return outcome === "ok" ? { ok: true } : { ok: false, error: VAULT_EXISTS };
  } catch (error) {
    logActionError("createVaultAction", error);
    return { ok: false, error: SAVE_FAILED };
  }
}
