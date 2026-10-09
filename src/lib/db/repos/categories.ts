import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  type Category,
  type CategorySetResult,
  type Subcategory,
  validateCategorySet,
} from "@/lib/domain/budget";
import { currentMonth, type YearMonth } from "@/lib/domain/month";
import type { CategorySetDto, MonthPayload } from "@/lib/vault/types";
import { monthStartOf, type PercentVersion, resolvePercent } from "@/lib/domain/percent-history";
import { db } from "../client";
import { category, categoryPercent, plain, subcategory, transaction } from "../schema";

export type CategoryItem = {
  id?: string;
  name: string;
  percentMicro: number;
  color: number;
  /** Omitted means false (an expense category). */
  isInvestment?: boolean;
  /** Omitted means none: the category's existing subcategories are removed. */
  subcategories?: { id?: string; name: string }[];
};

const columns = {
  id: category.id,
  name: category.name,
  color: category.color,
  isInvestment: category.isInvestment,
  deletedFrom: category.deletedFrom,
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
    byCategory.set(categoryId, [
      ...(byCategory.get(categoryId) ?? []),
      { id, name: plain(name, "subcategory.name") },
    ]);
  }
  const versionsOf = new Map<string, PercentVersion[]>();
  for (const { categoryId, fromMonth, percentMicro } of versions) {
    const version = { fromMonth, percentMicro: plain(percentMicro, "category_percent.percent_micro") };
    versionsOf.set(categoryId, [...(versionsOf.get(categoryId) ?? []), version]);
  }
  return categories.map(({ deletedFrom, name, ...c }) => {
    const percent = resolvePercent(versionsOf.get(c.id) ?? [], resolveAt);
    return {
      ...c,
      name: plain(name, "category.name"),
      deleted: deletedFrom !== null,
      percentMicro: percent ?? 0,
      hasPercent: percent !== null,
      subcategories: byCategory.get(c.id) ?? [],
    };
  });
}

/**
 * `listForMonth` for a sealed account: the categories in force in `month` (active, or deleted after
 * it, flagged `deleted`), in creation order, each with its sealed name, EVERY percent version
 * (the browser resolves the one in force) and its subcategories in creation order. `now` is kept
 * for symmetry with `listForMonth`: nothing is resolved on the server.
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

/** The user's active categories with the percent in force in the month of `now`. */
function list(userId: string, now: Date = new Date()): Promise<Category[]> {
  return listForMonth(userId, currentMonth(now), now);
}

const minMonth = (a: YearMonth, b: YearMonth): YearMonth =>
  a.year !== b.year ? (a.year < b.year ? a : b) : a.month <= b.month ? a : b;

/**
 * Replaces the user's whole set atomically: items with `id` are updated, items without are
 * created and categories left out are soft-deleted (`deleted_from` = current month, versions and
 * subcategories stay); subcategories left out are deleted. Removing a category or subcategory
 * that has expenses aborts the whole replacement.
 */
async function replaceSet(
  userId: string,
  cats: CategoryItem[],
  now: Date = new Date(),
): Promise<CategorySetResult> {
  const fromMonth = monthStartOf(currentMonth(now));
  const items = cats.map((c) => ({
    ...c,
    isInvestment: c.isInvestment ?? false,
    subcategories: c.subcategories ?? [],
  }));
  const valid = validateCategorySet(
    items.map((c) => ({ name: c.name, micro: c.percentMicro, subcategories: c.subcategories })),
  );
  if (!valid.ok) return valid;

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
      .select({ id: subcategory.id, categoryId: subcategory.categoryId, name: subcategory.name })
      .from(subcategory)
      .where(eq(subcategory.userId, userId));
    const parentOf = new Map(existingSubs.map((s) => [s.id, s.categoryId]));
    const subOwnedByItem = items.every((c) =>
      c.subcategories.every((s) => !s.id || (c.id && parentOf.get(s.id) === c.id)),
    );
    if (!subOwnedByItem) return { ok: false, error: "Subcategoria não encontrada" };

    const versions = await tx
      .select({
        categoryId: categoryPercent.categoryId,
        fromMonth: categoryPercent.fromMonth,
        percentMicro: categoryPercent.percentMicro,
      })
      .from(categoryPercent)
      .innerJoin(category, eq(category.id, categoryPercent.categoryId))
      .where(eq(category.userId, userId));
    const versionsOf = new Map<string, PercentVersion[]>();
    for (const { categoryId, fromMonth, percentMicro } of versions) {
      const version = { fromMonth, percentMicro: plain(percentMicro, "category_percent.percent_micro") };
      versionsOf.set(categoryId, [...(versionsOf.get(categoryId) ?? []), version]);
    }

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
        .update(category)
        .set({ deletedFrom: fromMonth })
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
    for (const { id, name, percentMicro, color, isInvestment, subcategories } of items) {
      let categoryId = id;
      if (categoryId) {
        await tx
          .update(category)
          .set({ name, color, isInvestment })
          .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
      } else {
        [{ id: categoryId }] = await tx
          .insert(category)
          .values({ userId, name, color, isInvestment })
          .returning({ id: category.id });
      }

      // A version is stored only when the percent differs from the one in force this month.
      const inForce = id ? resolvePercent(versionsOf.get(id) ?? [], fromMonth) : null;
      if (inForce !== percentMicro) {
        await tx
          .insert(categoryPercent)
          .values({ categoryId, fromMonth, percentMicro })
          .onConflictDoUpdate({
            target: [categoryPercent.categoryId, categoryPercent.fromMonth],
            set: { percentMicro },
          });
      }

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
  list,
  listForMonth,
  listForMonthSealed,
  replaceSet,
  replaceSetSealed,
  countExpenses,
};
