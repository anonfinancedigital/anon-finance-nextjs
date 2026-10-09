import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type { CategorySetResult } from "@/lib/domain/budget";
import { currentMonth, type YearMonth } from "@/lib/domain/month";
import type { CategorySetDto, MonthPayload } from "@/lib/vault/types";
import { monthStartOf } from "@/lib/domain/percent-history";
import { db } from "../client";
import { category, categoryPercent, plain, subcategory, transaction } from "../schema";

function expensesMessage(n: number) {
  return `Esta categoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

function subcategoryExpensesMessage(n: number) {
  return `Esta subcategoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

/**
 * `listForMonth` for a sealed account: the categories in force in `month` (active, or deleted after
 * it, flagged `deleted`), in creation order, each with its sealed name, EVERY percent version
 * (the browser resolves the one in force) and its subcategories in creation order. `now` is kept
 * in the signature: nothing is resolved on the server.
 */
async function listForMonthSealed(
  userId: string,
  month: YearMonth,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the T15 signature
  _now: Date = new Date(),
): Promise<MonthPayload["categories"]> {
  const monthStart = monthStartOf(month);
  const categories = await db
    .select({
      id: category.id,
      color: category.color,
      isInvestment: category.isInvestment,
      deletedFrom: category.deletedFrom,
      nameCt: category.nameCt,
    })
    .from(category)
    .where(
      and(
        eq(category.userId, userId),
        or(isNull(category.deletedFrom), gt(category.deletedFrom, monthStart)),
      ),
    )
    .orderBy(asc(category.createdAt), asc(category.id));
  const versions = await db
    .select({
      categoryId: categoryPercent.categoryId,
      fromMonth: categoryPercent.fromMonth,
      percentCt: categoryPercent.percentCt,
    })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId))
    .orderBy(asc(categoryPercent.fromMonth));
  const subcategories = await db
    .select({ id: subcategory.id, categoryId: subcategory.categoryId, nameCt: subcategory.nameCt })
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));

  const subsOf = new Map<string, { id: string; nameCt: string }[]>();
  for (const { id, categoryId, nameCt } of subcategories) {
    subsOf.set(categoryId, [
      ...(subsOf.get(categoryId) ?? []),
      { id, nameCt: plain(nameCt, "subcategory.name_ct") },
    ]);
  }
  const versionsOf = new Map<string, { fromMonth: string; percentCt: string }[]>();
  for (const { categoryId, fromMonth, percentCt } of versions) {
    versionsOf.set(categoryId, [
      ...(versionsOf.get(categoryId) ?? []),
      { fromMonth, percentCt: plain(percentCt, "category_percent.percent_ct") },
    ]);
  }
  return categories.map(({ deletedFrom, nameCt, ...c }) => ({
    ...c,
    deleted: deletedFrom !== null,
    nameCt: plain(nameCt, "category.name_ct"),
    versions: versionsOf.get(c.id) ?? [],
    subcategories: subsOf.get(c.id) ?? [],
  }));
}

/**
 * `replaceSet` for a sealed account. Nothing is compared or validated by value: the browser
 * validates the sum and the names before sealing. Ids of new rows come from the client (they are
 * part of the AAD): a category without `id` is inserted with `clientId`; a subcategory whose id is
 * not in the database is inserted with that id (one sent without id gets a database default).
 * `percentChange` upserts a version at the first day of the current month of America/Sao_Paulo
 * (its `fromMonth` is not trusted); no `percentChange`, no version. Same soft delete, ownership and
 * expense-blocking rules and messages as `replaceSet`; the whole save is atomic.
 */
async function replaceSetSealed(
  userId: string,
  dto: CategorySetDto,
  now: Date = new Date(),
): Promise<CategorySetResult> {
  const fromMonth = monthStartOf(currentMonth(now));
  const items = dto.items;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.userId, userId), isNull(category.deletedFrom)));
    const existingIds = new Set(existing.map((c) => c.id));
    const keptIds = new Set(items.flatMap((c) => (c.id ? [c.id] : [])));

    if ([...keptIds].some((id) => !existingIds.has(id))) {
      return { ok: false, error: "Categoria não encontrada" };
    }

    const existingSubs = await tx
      .select({ id: subcategory.id, categoryId: subcategory.categoryId })
      .from(subcategory)
      .where(eq(subcategory.userId, userId));
    const parentOf = new Map(existingSubs.map((s) => [s.id, s.categoryId]));
    // A sent id that exists anywhere (other category, other user) must belong to this very item.
    const sentSubIds = items.flatMap((c) => c.subcategories.flatMap((s) => (s.id ? [s.id] : [])));
    const anywhere = sentSubIds.length
      ? await tx
          .select({ id: subcategory.id, userId: subcategory.userId, categoryId: subcategory.categoryId })
          .from(subcategory)
          .where(inArray(subcategory.id, sentSubIds))
      : [];
    const owner = new Map(anywhere.map((s) => [s.id, s]));
    const subsOk = items.every((c) =>
      c.subcategories.every((s) => {
        const found = s.id ? owner.get(s.id) : undefined;
        return !found || (found.userId === userId && c.id !== undefined && found.categoryId === c.id);
      }),
    );
    if (!subsOk) return { ok: false, error: "Subcategoria não encontrada" };

    const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
    if (removedIds.length > 0) {
      const [blocked] = await tx
        .select({ n: count() })
        .from(transaction)
        .where(inArray(transaction.categoryId, removedIds))
        .groupBy(transaction.categoryId)
        .limit(1);
      if (blocked) return { ok: false, error: expensesMessage(blocked.n) };
    }

    const keptSubIds = new Set(sentSubIds);
    const removedSubIds = existingSubs
      .filter((s) => keptIds.has(s.categoryId) && !keptSubIds.has(s.id))
      .map((s) => s.id);
    if (removedSubIds.length > 0) {
      const [blocked] = await tx
        .select({ n: count(), subcategoryId: transaction.subcategoryId })
        .from(transaction)
        .where(inArray(transaction.subcategoryId, removedSubIds))
        .groupBy(transaction.subcategoryId)
        .limit(1);
      if (blocked) {
        const index = items.findIndex((c) => c.id === parentOf.get(blocked.subcategoryId!));
        return {
          ok: false,
          error: subcategoryExpensesMessage(blocked.n),
          fieldErrors: { [`${index}.subcategories`]: subcategoryExpensesMessage(blocked.n) },
        };
      }
      await tx.delete(subcategory).where(inArray(subcategory.id, removedSubIds));
    }

    if (removedIds.length > 0) {
      await tx
        .update(category)
        .set({ deletedFrom: fromMonth })
        .where(and(eq(category.userId, userId), inArray(category.id, removedIds)));
    }

    // One statement per item, in order, so clock_timestamp() preserves the creation order.
    for (const item of items) {
      const { id, clientId, color, isInvestment, nameCt, percentChange, subcategories } = item;
      const categoryId = id ?? clientId;
      if (id) {
        await tx
          .update(category)
          .set({ nameCt, name: null, color, isInvestment })
          .where(and(eq(category.id, id), eq(category.userId, userId)));
      } else {
        await tx.insert(category).values({ id: clientId, userId, nameCt, color, isInvestment });
      }

      if (percentChange) {
        const { percentCt } = percentChange;
        await tx
          .insert(categoryPercent)
          .values({ categoryId, fromMonth, percentCt })
          .onConflictDoUpdate({
            target: [categoryPercent.categoryId, categoryPercent.fromMonth],
            set: { percentCt, percentMicro: null },
          });
      }

      for (const sub of subcategories) {
        if (sub.id && parentOf.get(sub.id) === categoryId) {
          await tx
            .update(subcategory)
            .set({ nameCt: sub.nameCt, name: null })
            .where(eq(subcategory.id, sub.id));
        } else {
          await tx
            .insert(subcategory)
            .values({ id: sub.id, userId, categoryId, nameCt: sub.nameCt });
        }
      }
    }
    return { ok: true };
  });
}

/** Number of expenses linked to the category. */
async function countExpenses(categoryId: string): Promise<number> {
  return db.$count(transaction, eq(transaction.categoryId, categoryId));
}

export const categoriesRepo = {
  listForMonthSealed,
  replaceSetSealed,
  countExpenses,
};
