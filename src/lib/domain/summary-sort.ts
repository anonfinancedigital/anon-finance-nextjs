import type { CategorySummary } from "./budget";

export type SummarySortKey = "name" | "percent" | "target" | "spent" | "remaining" | "consumption";
export type SummarySort = { key: SummarySortKey; direction: "asc" | "desc" } | null;

/**
 * A first click starts where the column is most useful: names A to Z, "Restante" smallest first (who
 * overspent most), the other amounts largest first.
 */
const FIRST_DIRECTION: Record<SummarySortKey, "asc" | "desc"> = {
  name: "asc",
  percent: "desc",
  target: "desc",
  spent: "desc",
  remaining: "asc",
  consumption: "desc",
};

/** The order the table starts in, and the one a third click on a header returns to: who consumed most of the target first. */
export const DEFAULT_SUMMARY_SORT: SummarySort = { key: "consumption", direction: "desc" };

/** Click cycle of a column header: first direction, then the opposite, then back to the default order. */
export function nextSummarySort(current: SummarySort, key: SummarySortKey): SummarySort {
  const first = FIRST_DIRECTION[key];
  if (current?.key !== key) return { key, direction: first };
  if (current.direction === first) return { key, direction: first === "asc" ? "desc" : "asc" };
  return DEFAULT_SUMMARY_SORT;
}

type Row = Pick<
  CategorySummary,
  "name" | "percentMicro" | "targetCents" | "spentCents" | "remainingCents" | "consumedPct" | "hasPercent"
>;

/** Value of a row in a column, or null where the table shows "—" (a category with no target has no figure to rank). */
function valueOf(row: Row, key: SummarySortKey): number | string | null {
  if (key === "name") return row.name;
  if (key === "spent") return row.spentCents;
  if (row.hasPercent === false) return null;
  if (key === "percent") return row.percentMicro;
  if (key === "target") return row.targetCents;
  if (key === "remaining") return row.remainingCents;
  return row.consumedPct;
}

/**
 * The rows in the order of `sort` (null keeps the given order). Ties keep their original order, and rows
 * with no figure in the column stay at the end in either direction.
 */
export function sortSummaryRows<T extends Row>(rows: T[], sort: SummarySort): T[] {
  if (!sort) return rows;
  const sign = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: valueOf(row, sort.key) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return a.value === b.value ? a.index - b.index : a.value === null ? 1 : -1;
      }
      const order =
        typeof a.value === "string" && typeof b.value === "string"
          ? a.value.localeCompare(b.value, "pt-BR")
          : (a.value as number) - (b.value as number);
      return order === 0 ? a.index - b.index : sign * order;
    })
    .map(({ row }) => row);
}
