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

/** Segments of the same series as `seg` that start after `month`. */
function laterIds(segments: Segment[], seg: Segment, month: string): string[] {
  if (seg.seriesId === null) return [];
  return segments
    .filter((s) => s.seriesId === seg.seriesId && monthKey(s.date) > month)
    .map((s) => s.id);
}

export type DeletePlan = { deleteIds: string[]; truncate?: { id: string; endMonth: string } };

/**
 * Deleting the occurrence of `month` of segment `id`: removes that month and every later one.
 * Segments of the series starting after `month` go away; the segment itself is deleted when it
 * starts in `month` (or is non-recurring), otherwise it ends in the previous month.
 */
export function planDelete(input: { segments: Segment[]; id: string; month: string }): DeletePlan {
  const seg = input.segments.find((s) => s.id === input.id)!;
  const later = laterIds(input.segments, seg, input.month);
  if (seg.recurringDay === null || monthKey(seg.date) === input.month) {
    return { deleteIds: [seg.id, ...later] };
  }
  return { deleteIds: later, truncate: { id: seg.id, endMonth: previousMonthKey(input.month) } };
}

/**
 * Intended day after an edit in month `key`: the original day when the submitted date is the
 * projected one (keeps 31 through a 28/02 occurrence), otherwise the submitted day.
 */
export function resolveDay(prev: Segment, key: string, submittedDate: string): number {
  if (prev.recurringDay !== null && submittedDate === occurrenceDate(prev, key)) {
    return prev.recurringDay;
  }
  return Number(submittedDate.slice(8, 10));
}

/** Recurrence part of the data submitted for an edit. */
export type EditedData = {
  /** AAAA-MM-DD submitted in the form. */
  date: string;
  recurring: boolean;
  /** AAAA-MM, inclusive; null = no end (always null when not recurring). */
  endMonth: string | null;
};

export type EditPlan = {
  deleteIds: string[];
  updateInPlace?: Segment;
  truncate?: { id: string; endMonth: string };
  insert?: Omit<Segment, "id">;
};

/**
 * Editing the occurrence of `month` of segment `id`: the new data applies to `month` and every
 * later month. Later segments of the series are deleted (this edit overrides later ones); the
 * segment is updated in place when it starts in `month` or is non-recurring, otherwise it ends in
 * the previous month and a new segment of the same series starts in `month`.
 */
export function planEdit(input: {
  segments: Segment[];
  id: string;
  month: string;
  next: EditedData;
}): EditPlan {
  const { segments, month, next } = input;
  const seg = segments.find((s) => s.id === input.id)!;
  const result: Omit<Segment, "id"> = next.recurring
    ? {
        seriesId: seg.seriesId ?? seg.id,
        date: next.date,
        recurringDay: resolveDay(seg, month, next.date),
        endMonth: next.endMonth,
      }
    : { seriesId: null, date: next.date, recurringDay: null, endMonth: null };
  const deleteIds = laterIds(segments, seg, month);
  if (seg.recurringDay === null || monthKey(seg.date) === month) {
    return { deleteIds, updateInPlace: { id: seg.id, ...result } };
  }
  return {
    deleteIds,
    truncate: { id: seg.id, endMonth: previousMonthKey(month) },
    insert: result,
  };
}
