import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  type Category,
  type CategorySetResult,
  type Subcategory,
  validateCategorySet,
} from "@/lib/domain/budget";
import { currentMonth, type YearMonth } from "@/lib/domain/month";
import { monthStartOf, type PercentVersion, resolvePercent } from "@/lib/domain/percent-history";
import { db } from "../client";
import { category, categoryPercent, subcategory, transaction } from "../schema";

export type CategoryItem = {
  id?: string;
  name: string;
  percentMicro: number;
  color: number;
  /** Omitted means none: the category's existing subcategories are removed. */
  subcategories?: { id?: string; name: string }[];
};

const columns = {
  id: category.id,
  name: category.name,
  color: category.color,
};

function expensesMessage(n: number) {
  return `Esta categoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

function subcategoryExpensesMessage(n: number) {
  return `Esta subcategoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

/**
 * The user's categories in force in `month`, in creation order, each with its subcategories in
 * creation order. A category is in force when it is active or deleted after `month`; its percent
 * is the version in force that month (months after the current one use the current month's
 * versions). No version in force means `percentMicro` 0 and `hasPercent` false.
 */
async function listForMonth(
  userId: string,
  month: YearMonth,
  now: Date = new Date(),
): Promise<Category[]> {
  const monthStart = monthStartOf(month);
  const resolveAt = monthStartOf(minMonth(month, currentMonth(now)));
  const categories = await db
    .select(columns)
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
      percentMicro: categoryPercent.percentMicro,
    })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId));
  const subcategories = await db
    .select({ id: subcategory.id, categoryId: subcategory.categoryId, name: subcategory.name })
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));

  const byCategory = new Map<string, Subcategory[]>();
  for (const { id, categoryId, name } of subcategories) {
    byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), { id, name }]);
  }
  const versionsOf = new Map<string, PercentVersion[]>();
  for (const { categoryId, ...version } of versions) {
    versionsOf.set(categoryId, [...(versionsOf.get(categoryId) ?? []), version]);
  }
  return categories.map((c) => {
    const percent = resolvePercent(versionsOf.get(c.id) ?? [], resolveAt);
    return {
      ...c,
      percentMicro: percent ?? 0,
      hasPercent: percent !== null,
      subcategories: byCategory.get(c.id) ?? [],
    };
  });
}

/** The user's active categories with the percent in force in the month of `now`. */
function list(userId: string, now: Date = new Date()): Promise<Category[]> {
  return listForMonth(userId, currentMonth(now), now);
}

const minMonth = (a: YearMonth, b: YearMonth): YearMonth =>
  a.year !== b.year ? (a.year < b.year ? a : b) : a.month <= b.month ? a : b;

/**
 * Replaces the user's whole set atomically: items with `id` are updated, items without are
 * created and categories left out are deleted; the same goes for each category's subcategories.
 * Removing a category or subcategory that has expenses aborts the whole replacement.
 */
async function replaceSet(userId: string, cats: CategoryItem[]): Promise<CategorySetResult> {
  const items = cats.map((c) => ({ ...c, subcategories: c.subcategories ?? [] }));
  const valid = validateCategorySet(
    items.map((c) => ({ name: c.name, micro: c.percentMicro, subcategories: c.subcategories })),
  );
  if (!valid.ok) return valid;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: category.id })
      .from(category)
      .where(eq(category.userId, userId));
    const existingIds = new Set(existing.map((c) => c.id));
    const keptIds = new Set(items.flatMap((c) => (c.id ? [c.id] : [])));

    if ([...keptIds].some((id) => !existingIds.has(id))) {
      return { ok: false, error: "Categoria não encontrada" };
    }

    const existingSubs = await tx
      .select({ id: subcategory.id, categoryId: subcategory.categoryId, name: subcategory.name })
      .from(subcategory)
      .where(eq(subcategory.userId, userId));
    const parentOf = new Map(existingSubs.map((s) => [s.id, s.categoryId]));
    const subOwnedByItem = items.every((c) =>
      c.subcategories.every((s) => !s.id || (c.id && parentOf.get(s.id) === c.id)),
    );
    if (!subOwnedByItem) return { ok: false, error: "Subcategoria não encontrada" };

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

    // Subcategories of removed categories go with them (cascade); the category check above
    // already covers their expenses.
    const keptSubIds = new Set(items.flatMap((c) => c.subcategories.flatMap((s) => (s.id ? [s.id] : []))));
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
        .delete(category)
        .where(and(eq(category.userId, userId), inArray(category.id, removedIds)));
    }

    // Renamed subcategories first get a temporary unique name, so swapping two names in one save
    // (A↔B) does not hit the unique index halfway.
    const currentName = new Map(existingSubs.map((s) => [s.id, s.name]));
    for (const { id, name } of items.flatMap((c) => c.subcategories)) {
      if (id && currentName.get(id) !== name) {
        await tx.update(subcategory).set({ name: `~${id}` }).where(eq(subcategory.id, id));
      }
    }

    // One statement per item, in order, so clock_timestamp() preserves the creation order.
    for (const { id, name, percentMicro, color, subcategories } of items) {
      let categoryId = id;
      if (categoryId) {
        await tx
          .update(category)
          .set({ name, percentMicro, color })
          .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
      } else {
        [{ id: categoryId }] = await tx
          .insert(category)
          .values({ userId, name, percentMicro, color })
          .returning({ id: category.id });
      }

      // Transitional (T5): keeps the single "since ever" version in sync until T6 stores monthly versions.
      await tx
        .insert(categoryPercent)
        .values({ categoryId: categoryId!, fromMonth: "0001-01-01", percentMicro })
        .onConflictDoUpdate({
          target: [categoryPercent.categoryId, categoryPercent.fromMonth],
          set: { percentMicro },
        });

      for (const sub of subcategories) {
        if (sub.id) {
          await tx.update(subcategory).set({ name: sub.name }).where(eq(subcategory.id, sub.id));
        } else {
          await tx.insert(subcategory).values({ userId, categoryId, name: sub.name });
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

export const categoriesRepo = { list, listForMonth, replaceSet, countExpenses };
