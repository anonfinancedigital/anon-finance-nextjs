import { asc, eq } from "drizzle-orm";
import type { ExportPayload } from "@/lib/vault/types";
import { db } from "../client";
import { category, categoryPercent, subcategory, transaction } from "../schema";
import { goalsRepo } from "./goals";
import { vaultRepo } from "./vault";

/**
 * Every sealed row of the user for the export (SIGILO-37): raw transactions (series segments with
 * their recurrence fields, not projected occurrences), all categories (deleted ones too) with every
 * percent version and subcategory, the goal and the sealed birth date. Rows of other users are
 * never selected; plain-text legacy rows (NULL ciphertext) are skipped.
 */
async function exportRowsSealed(userId: string): Promise<ExportPayload> {
  const txRows = await db
    .select({
      id: transaction.id,
      kind: transaction.kind,
      date: transaction.date,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      amountCt: transaction.amountCt,
      descriptionCt: transaction.descriptionCt,
      recurring: transaction.recurring,
      recurrenceDay: transaction.recurrenceDay,
      recurrenceEnd: transaction.recurrenceEnd,
      seriesId: transaction.seriesId,
    })
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(asc(transaction.createdAt), asc(transaction.id));

  const categoryRows = await db
    .select({
      id: category.id,
      color: category.color,
      isInvestment: category.isInvestment,
      deletedFrom: category.deletedFrom,
      nameCt: category.nameCt,
    })
    .from(category)
    .where(eq(category.userId, userId))
    .orderBy(asc(category.createdAt), asc(category.id));

  const versionRows = await db
    .select({
      categoryId: categoryPercent.categoryId,
      fromMonth: categoryPercent.fromMonth,
      percentCt: categoryPercent.percentCt,
    })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId))
    .orderBy(asc(categoryPercent.fromMonth));

  const subRows = await db
    .select({ id: subcategory.id, categoryId: subcategory.categoryId, nameCt: subcategory.nameCt })
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));

  const versionsOf = new Map<string, { fromMonth: string; percentCt: string }[]>();
  for (const { categoryId, fromMonth, percentCt } of versionRows) {
    if (percentCt === null) continue;
    versionsOf.set(categoryId, [...(versionsOf.get(categoryId) ?? []), { fromMonth, percentCt }]);
  }
  const subsOf = new Map<string, { id: string; nameCt: string }[]>();
  for (const { id, categoryId, nameCt } of subRows) {
    if (nameCt === null) continue;
    subsOf.set(categoryId, [...(subsOf.get(categoryId) ?? []), { id, nameCt }]);
  }

  return {
    transactions: txRows.flatMap(({ amountCt, ...row }) => (amountCt === null ? [] : [{ ...row, amountCt }])),
    categories: categoryRows.flatMap(({ nameCt, ...c }) =>
      nameCt === null
        ? []
        : [{ ...c, nameCt, versions: versionsOf.get(c.id) ?? [], subcategories: subsOf.get(c.id) ?? [] }],
    ),
    goal: await goalsRepo.getSealed(userId),
    birthDateCt: await vaultRepo.getBirthDateSealed(userId),
  };
}

export { exportRowsSealed };
