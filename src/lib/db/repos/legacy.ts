import { asc, eq } from "drizzle-orm";
import type { LegacyPlain } from "@/lib/vault/types";
import { user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, plain, subcategory, transaction, userVault } from "../schema";

export type ReadPlainResult = { ok: true; plain: LegacyPlain } | { ok: false; reason: "not_legacy" };

/** A legacy account is an existing user without a `user_vault` row. */
async function isLegacy(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id, vault: userVault.userId })
    .from(user)
    .leftJoin(userVault, eq(userVault.userId, user.id))
    .where(eq(user.id, userId));
  return row !== undefined && row.vault === null;
}

/**
 * Reads the plain-text rows of the user once, for the migration: transactions (raw, with series
 * fields), categories (deleted ones too) with every percent version and subcategory, the goal and
 * the birth date. `not_legacy` when the user has a vault (or does not exist). Only that user's rows.
 */
async function readPlain(userId: string): Promise<ReadPlainResult> {
  if (!(await isLegacy(userId))) return { ok: false, reason: "not_legacy" };

  const txRows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(asc(transaction.createdAt), asc(transaction.id));
  const categoryRows = await db
    .select()
    .from(category)
    .where(eq(category.userId, userId))
    .orderBy(asc(category.createdAt), asc(category.id));
  const versionRows = await db
    .select({
      categoryId: categoryPercent.categoryId,
      fromMonth: categoryPercent.fromMonth,
      percentMicro: categoryPercent.percentMicro,
    })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId))
    .orderBy(asc(categoryPercent.fromMonth));
  const subRows = await db
    .select()
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));
  const [goal] = await db.select().from(financialGoal).where(eq(financialGoal.userId, userId));
  const [owner] = await db.select({ birthDate: user.birthDate }).from(user).where(eq(user.id, userId));

  const versionsOf = new Map<string, { fromMonth: string; percentMicro: number }[]>();
  for (const v of versionRows) {
    versionsOf.set(v.categoryId, [
      ...(versionsOf.get(v.categoryId) ?? []),
      { fromMonth: v.fromMonth, percentMicro: plain(v.percentMicro, "category_percent.percent_micro") },
    ]);
  }
  const subsOf = new Map<string, { id: string; name: string }[]>();
  for (const s of subRows) {
    subsOf.set(s.categoryId, [
      ...(subsOf.get(s.categoryId) ?? []),
      { id: s.id, name: plain(s.name, "subcategory.name") },
    ]);
  }

  return {
    ok: true,
    plain: {
      transactions: txRows.map((t) => ({
        id: t.id,
        kind: t.kind,
        date: t.date,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        amountCents: plain(t.amountCents, "transaction.amount_cents"),
        description: t.description,
        recurring: t.recurring,
        recurrenceDay: t.recurrenceDay,
        recurrenceEnd: t.recurrenceEnd,
        seriesId: t.seriesId,
      })),
      categories: categoryRows.map((c) => ({
        id: c.id,
        name: plain(c.name, "category.name"),
        color: c.color,
        isInvestment: c.isInvestment,
        deletedFrom: c.deletedFrom,
        versions: versionsOf.get(c.id) ?? [],
        subcategories: subsOf.get(c.id) ?? [],
      })),
      goal:
        goal &&
        goal.monthlyIncomeCents !== null &&
        goal.savedCents !== null &&
        goal.retirementAge !== null &&
        goal.annualRateBp !== null &&
        goal.withdrawalRateBp !== null
          ? {
              monthlyIncomeCents: goal.monthlyIncomeCents,
              savedCents: goal.savedCents,
              retirementAge: goal.retirementAge,
              annualRateBp: goal.annualRateBp,
              withdrawalRateBp: goal.withdrawalRateBp,
            }
          : null,
      birthDate: owner?.birthDate ?? null,
    },
  };
}

export const legacyRepo = { isLegacy, readPlain };
