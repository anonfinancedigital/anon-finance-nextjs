import { netByDay } from "./day-total";

/**
 * Paid state of recurring occurrences (AD-018). Isomorphic: no server imports.
 * `paid`: `true` paid, `false` or absent not paid, `null` not recurring.
 */
type PaidState = { recurring?: boolean; paid?: boolean | null };

/** A one-off row always counts; a recurring occurrence counts only when paid. */
export function countsInTotals(o: PaidState): boolean {
  return !o.recurring || o.paid === true;
}

/** Stable partition: rows that count first, unpaid recurring occurrences last; relative order kept. */
export function orderByPaid<T extends PaidState>(rows: T[]): T[] {
  return [...rows.filter(countsInTotals), ...rows.filter((r) => !countsInTotals(r))];
}

/** Applies optimistic overrides (by id) to recurring rows only; one-off rows ignore them. */
export function applyPaid<T extends PaidState & { id: string }>(rows: T[], overrides: ReadonlyMap<string, boolean>): T[] {
  return rows.map((r) => (r.recurring && overrides.has(r.id) ? { ...r, paid: overrides.get(r.id)! } : r));
}

export function paidLabel(kind: "income" | "expense", paid: boolean | null | undefined): string {
  if (kind === "income") return paid === true ? "Recebido" : "Não recebido";
  return paid === true ? "Pago" : "Não pago";
}

/** Net of each day over the rows that count in the totals. */
export function countedNetByDay<T extends PaidState & { date: string; kind: "income" | "expense"; amountCents: number }>(
  rows: T[],
): Map<string, number> {
  return netByDay(rows.filter(countsInTotals));
}

/** A day heading starts at the first row and whenever the date or the group (counts / unpaid) changes. */
export function startsDay<T extends PaidState & { date: string }>(prev: T | undefined, row: T): boolean {
  return prev === undefined || prev.date !== row.date || countsInTotals(prev) !== countsInTotals(row);
}
