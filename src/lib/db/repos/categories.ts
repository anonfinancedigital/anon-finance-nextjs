import { and, asc, count, eq, inArray } from "drizzle-orm";
import {
  type Category,
  type CategorySetResult,
  type Subcategory,
  validateCategorySet,
} from "@/lib/domain/budget";
import { db } from "../client";
import { category, subcategory, transaction } from "../schema";

export type CategoryItem = { id?: string; name: string; percentBp: number; color: number };

const columns = {
  id: category.id,
  name: category.name,
  percentBp: category.percentBp,
  color: category.color,
};

function expensesMessage(n: number) {
  return `Esta categoria tem ${n} ${n === 1 ? "gasto" : "gastos"} e não pode ser excluída`;
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
 * created and categories left out are deleted. Removing a category that has expenses aborts
 * the whole replacement.
 */
async function replaceSet(userId: string, cats: CategoryItem[]): Promise<CategorySetResult> {
  const valid = validateCategorySet(cats.map((c) => ({ name: c.name, bp: c.percentBp })));
  if (!valid.ok) return valid;

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: category.id })
      .from(category)
      .where(eq(category.userId, userId));
    const existingIds = new Set(existing.map((c) => c.id));
    const keptIds = new Set(cats.flatMap((c) => (c.id ? [c.id] : [])));

    if ([...keptIds].some((id) => !existingIds.has(id))) {
      return { ok: false, error: "Categoria não encontrada" };
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

      await tx
        .delete(category)
        .where(and(eq(category.userId, userId), inArray(category.id, removedIds)));
    }

    // One statement per item, in order, so clock_timestamp() preserves the creation order.
    for (const { id, name, percentBp, color } of cats) {
      if (id) {
        await tx
          .update(category)
          .set({ name, percentBp, color })
          .where(and(eq(category.id, id), eq(category.userId, userId)));
      } else {
        await tx.insert(category).values({ userId, name, percentBp, color });
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
