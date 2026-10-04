import type { YearMonth } from "./month";

/** One row of a recurring series (or a single, non-recurring row when `recurringDay` is null). */
export type Segment = {
  id: string;
  seriesId: string | null;
  /** AAAA-MM-DD: the first occurrence of the segment. */
  date: string;
  /** Intended day of the month (1..31); null for a non-recurring row. */
  recurringDay: number | null;
  /** AAAA-MM, inclusive; null = no end. */
  endMonth: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

const toYearMonth = (key: string): YearMonth => ({
  year: Number(key.slice(0, 4)),
  month: Number(key.slice(5, 7)),
});

/** "2026-10-15" → "2026-10". */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function previousMonthKey(key: string): string {
  const { year, month } = toYearMonth(key);
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
}

export function lastDayOfMonth(key: string): number {
  const { year, month } = toYearMonth(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Date of the segment's occurrence in month `key`; the stored date for a non-recurring row. */
export function occurrenceDate(seg: Segment, key: string): string {
  if (seg.recurringDay === null) return seg.date;
  return `${key}-${pad(Math.min(seg.recurringDay, lastDayOfMonth(key)))}`;
}

/** True when the segment has an occurrence in month `key`. */
export function appliesInMonth(seg: Segment, key: string): boolean {
  const start = monthKey(seg.date);
  if (seg.recurringDay === null) return start === key;
  return start <= key && (seg.endMonth === null || seg.endMonth >= key);
}
