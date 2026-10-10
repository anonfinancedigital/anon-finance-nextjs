import { and, eq, isNull, sql } from "drizzle-orm";
import type { ImportPayload } from "@/lib/vault/types";
import { user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, subcategory, transaction, userVault } from "../schema";

/** Rows per INSERT: keeps every statement far below Postgres' 65.535 bind-parameter limit. */
const BATCH = 1_000;

export type ImportResult = { ok: true; transactions: number; categories: number } | { ok: false; reason: "not_empty" };

const chunks = <T>(rows: T[]): T[][] =>
  Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, i) => rows.slice(i * BATCH, (i + 1) * BATCH));

/**
 * An account is empty when it has no transaction and no active category. Soft-deleted categories
 * (AD-007) do not count: without transactions they only haunt past months, and the import removes
 * them. Goal and birth date do not count either.
 */
async function isEmpty(userId: string, executor: Pick<typeof db, "$count"> = db): Promise<boolean> {
  const transactions = await executor.$count(transaction, eq(transaction.userId, userId));
  const categories = await executor.$count(category, and(eq(category.userId, userId), isNull(category.deletedFrom)));
  return transactions === 0 && categories === 0;
}

/**
 * Writes an import into an empty account in ONE transaction (IMPORT-04, IMPORT-16): the user row is
 * locked so two imports cannot interleave (IMPORT-17) and the emptiness check happens under that lock
 * (IMPORT-15) and leftover soft-deleted categories are removed (IMPORT-34). Every row gets `userId`, plain-text columns stay NULL. The goal is written only when
 * the user has none and the birth date only when the vault has none (IMPORT-20 to IMPORT-24). Any
 * error undoes everything (IMPORT-14).
 */
async function importSealed(userId: string, payload: ImportPayload): Promise<ImportResult> {
  return db.transaction(async (tx) => {
    const [owner] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    if (!owner) throw new Error("User not found");

    if (!(await isEmpty(userId, tx))) return { ok: false, reason: "not_empty" };

    // No transaction references them (checked above), so the restrict FK allows it; versions and subcategories cascade.
    await tx.delete(category).where(eq(category.userId, userId));

    for (const rows of chunks(payload.categories)) {
      await tx
        .insert(category)
        .values(rows.map((c) => ({ id: c.id, userId, nameCt: c.nameCt, color: c.color, isInvestment: c.isInvestment, deletedFrom: c.deletedFrom })));
    }
    for (const rows of chunks(payload.categories.flatMap((c) => c.versions.map((v) => ({ categoryId: c.id, fromMonth: v.fromMonth, percentCt: v.percentCt }))))) {
      await tx.insert(categoryPercent).values(rows);
    }
    for (const rows of chunks(payload.categories.flatMap((c) => c.subcategories.map((s) => ({ id: s.id, userId, categoryId: c.id, nameCt: s.nameCt }))))) {
      await tx.insert(subcategory).values(rows);
    }
    for (const rows of chunks(payload.transactions)) {
      await tx.insert(transaction).values(rows.map((t) => ({ ...t, userId })));
    }

    if (payload.goal) {
      // `annual_rate_bp` has a database default of 800: it must be written as an explicit NULL.
      await tx
        .insert(financialGoal)
        .values({
          userId,
          monthlyIncomeCents: null,
          savedCents: null,
          retirementAge: null,
          annualRateBp: null,
          withdrawalRateBp: null,
          ...payload.goal,
        })
        .onConflictDoNothing({ target: financialGoal.userId });
    }
    if (payload.birthDateCt) {
      await tx
        .update(userVault)
        .set({ birthDateCt: payload.birthDateCt })
        .where(sql`${userVault.userId} = ${userId} AND ${userVault.birthDateCt} IS NULL`);
    }
    return { ok: true, transactions: payload.transactions.length, categories: payload.categories.length };
  });
}

export const importRepo = { isEmpty, importSealed };
