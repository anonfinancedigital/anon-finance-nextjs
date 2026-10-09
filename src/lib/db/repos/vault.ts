import { eq, sql } from "drizzle-orm";
import type { VaultMaterial } from "@/lib/vault/types";
import { db } from "../client";
import { category, financialGoal, transaction, userVault } from "../schema";

/** The transaction handle `db.transaction` passes to its callback. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type KdfParamValues = Pick<VaultMaterial, "memKib" | "iterations" | "parallelism">;

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
};
