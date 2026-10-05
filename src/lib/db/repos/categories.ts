import { and, asc, count, eq, inArray } from "drizzle-orm";
import {
  type Category,
  type CategorySetResult,
  type Subcategory,
  validateCategorySet,
} from "@/lib/domain/budget";
import { db } from "../client";
import { category, subcategory, transaction } from "../schema";

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
  percentMicro: category.percentMicro,
  color: category.color,
};

function expensesMessage(n: number) {
  return `Esta categoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

function subcategoryExpensesMessage(n: number) {
  return `Esta subcategoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
}

/** The user's categories in creation order, each with its subcategories in creation order. */
async function list(userId: string): Promise<Category[]> {
  const categories = await db
    .select(columns)
    .from(category)
    .where(eq(category.userId, userId))
    .orderBy(asc(category.createdAt), asc(category.id));
  const subcategories = await db
    .select({ id: subcategory.id, categoryId: subcategory.categoryId, name: subcategory.name })
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));

  const byCategory = new Map<string, Subcategory[]>();
  for (const { id, categoryId, name } of subcategories) {
    byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), { id, name }]);
  }
  return categories.map((c) => ({ ...c, subcategories: byCategory.get(c.id) ?? [] }));
}

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

export const categoriesRepo = { list, replaceSet, countExpenses };
