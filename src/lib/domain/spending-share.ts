import type { CategorySummary } from "./budget";

/**
 * The slices of the spending donut and its legend: categories that spent something, largest first.
 * Ties keep the order of `rows`, so the chart does not shuffle between equal values.
 */
export function spendingShareSlices<T extends Pick<CategorySummary, "spentCents">>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.spentCents > 0)
    .sort((a, b) => b.row.spentCents - a.row.spentCents || a.index - b.index)
    .map(({ row }) => row);
}
