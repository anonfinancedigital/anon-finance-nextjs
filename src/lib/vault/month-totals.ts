import type { MonthTotals } from "@/lib/db/repos/transactions";

type Opened = {
  kind: "income" | "expense";
  amountCents: number;
  categoryId: string | null;
  subcategoryId: string | null;
};

/**
 * Month income and spending per category and subcategory over the month's opened occurrences
 * (one per row, a recurring series counted once), in the shape of the former SQL `monthTotals`:
 * incomes ignore categories, an expense without category is not counted, and the `null`
 * subcategory key holds expenses without one.
 */
export function computeMonthTotals(occurrences: Opened[]): MonthTotals {
  const totals: MonthTotals = { incomeCents: 0, spentByCategory: new Map(), spentBySubcategory: new Map() };
  for (const { kind, amountCents, categoryId, subcategoryId } of occurrences) {
    if (kind === "income") {
      totals.incomeCents += amountCents;
    } else if (categoryId) {
      totals.spentByCategory.set(categoryId, (totals.spentByCategory.get(categoryId) ?? 0) + amountCents);
      const bySub = totals.spentBySubcategory.get(categoryId) ?? new Map<string | null, number>();
      bySub.set(subcategoryId, (bySub.get(subcategoryId) ?? 0) + amountCents);
      totals.spentBySubcategory.set(categoryId, bySub);
    }
  }
  return totals;
}
