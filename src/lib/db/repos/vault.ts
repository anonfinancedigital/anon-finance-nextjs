import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { VaultMaterial } from "@/lib/vault/types";
import { db } from "../client";
import { category, financialGoal, transaction, userVault } from "../schema";
import { usersRepo } from "./users";

/** The transaction handle `db.transaction` passes to its callback. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type KdfParamValues = Pick<VaultMaterial, "memKib" | "iterations" | "parallelism">;

/** What the browser needs to derive its keys; `legacy` = the account still has plain-text data. */
export type KdfParamsResult =
  | { mode: "v1"; salt: string; m: number; t: number; p: number }
  | { mode: "legacy" };

/** Default Argon2id parameters, also the ones shown for e-mails without an account. */
const DECOY_PARAMS = { m: 65536, t: 3, p: 1 } as const;

/** Same normalization as `usersRepo` (trim, lower case). */
const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Deterministic fake salt for an e-mail without an account: the first 16 bytes of
 * HMAC-SHA256(BETTER_AUTH_SECRET, normalized e-mail), as base64url. Stable across calls, so the
 * answer does not reveal that the account does not exist.
 */
function decoySalt(email: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(normalize(email)).digest().subarray(0, 16).toString("base64url");
}

export const vaultRepo = {
  /** The user's key material, or `null` for a legacy account (no vault row). */
  async get(userId: string): Promise<VaultMaterial | null> {
    const [row] = await db
      .select({
        kdfVersion: userVault.kdfVersion,
        salt: userVault.salt,
        memKib: userVault.memKib,
        iterations: userVault.iterations,
        parallelism: userVault.parallelism,
        dekWrappedPw: userVault.dekWrappedPw,
        dekWrappedRecovery: userVault.dekWrappedRecovery,
      })
      .from(userVault)
      .where(eq(userVault.userId, userId));
    return row ? { ...row, kdfVersion: 1 } : null;
  },

  /** Stores the material of a user that has none. A second call for the same user fails (primary key). */
  async create(tx: Tx, userId: string, material: VaultMaterial): Promise<void> {
    await tx.insert(userVault).values({
      userId,
      kdfVersion: material.kdfVersion,
      salt: material.salt,
      memKib: material.memKib,
      iterations: material.iterations,
      parallelism: material.parallelism,
      dekWrappedPw: material.dekWrappedPw,
      dekWrappedRecovery: material.dekWrappedRecovery,
    });
  },

  /** Replaces salt, KDF parameters and the password-wrapped DEK; the recovery-wrapped DEK is kept. */
  async rewrap(
    tx: Tx,
    userId: string,
    input: { salt: string; params: KdfParamValues; dekWrappedPw: string },
  ): Promise<void> {
    await tx
      .update(userVault)
      .set({
        salt: input.salt,
        memKib: input.params.memKib,
        iterations: input.params.iterations,
        parallelism: input.params.parallelism,
        dekWrappedPw: input.dekWrappedPw,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(eq(userVault.userId, userId));
  },

  /**
   * Deletes the user's transactions, categories (subcategories and percent versions cascade) and
   * goal, and clears the sealed birth date. The key material stays for the caller to rewrite.
   */
  async wipeFinancialData(tx: Tx, userId: string): Promise<void> {
    // Transactions first: transaction.category_id is ON DELETE RESTRICT.
    await tx.delete(transaction).where(eq(transaction.userId, userId));
    await tx.delete(category).where(eq(category.userId, userId));
    await tx.delete(financialGoal).where(eq(financialGoal.userId, userId));
    await tx.update(userVault).set({ birthDateCt: null }).where(eq(userVault.userId, userId));
  },

  /**
   * KDF parameters for the login form: the user's real ones, `{ mode: "legacy" }` for an account
   * without a vault, or deterministic fake ones for an e-mail without an account (SIGILO-15).
   */
  async kdfParamsFor(email: string): Promise<KdfParamsResult> {
    const found = await usersRepo.findByEmail(email);
    if (!found) return { mode: "v1", salt: decoySalt(email), ...DECOY_PARAMS };
    const material = await vaultRepo.get(found.id);
    if (!material) return { mode: "legacy" };
    return {
      mode: "v1",
      salt: material.salt,
      m: material.memKib,
      t: material.iterations,
      p: material.parallelism,
    };
  },

  /** The sealed birth date, or `null` when the user has no vault or no date. */
  async getBirthDateSealed(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ birthDateCt: userVault.birthDateCt })
      .from(userVault)
      .where(eq(userVault.userId, userId));
    return row?.birthDateCt ?? null;
  },

  /** Stores the sealed birth date of that user's vault only (no vault row: nothing is written). */
  async setBirthDateSealed(userId: string, ct: string): Promise<void> {
    await db.update(userVault).set({ birthDateCt: ct }).where(eq(userVault.userId, userId));
  },
};
