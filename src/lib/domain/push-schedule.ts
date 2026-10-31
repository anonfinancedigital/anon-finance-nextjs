// When a daily push is due. Pure: the clock comes in as an argument.
import { appliesInMonth, monthKey, occurrenceDate, type Segment } from "./recurrence";

const TIME_ZONE = "America/Sao_Paulo";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Local calendar date (AAAA-MM-DD) and hour (0..23) in São Paulo. */
export function localClock(now: Date): { date: string; hour: number } {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** True when a recurring series has an occurrence on `date` (AAAA-MM-DD); one-off rows do not count. */
export function hasOccurrenceOn(segments: Segment[], date: string): boolean {
  const key = monthKey(date);
  return segments.some((s) => s.recurringDay !== null && appliesInMonth(s, key) && occurrenceDate(s, key) === date);
}

/** Daily notices go out from the preferred hour on, so a late or skipped cron run is caught up. */
export function isDueHour(clockHour: number, prefHour: number): boolean {
  return clockHour >= prefHour;
}
