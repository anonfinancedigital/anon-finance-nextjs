import { monthRange, type YearMonth } from "./month";

/** `fromMonth` is the first day of the month (AAAA-MM-01); `0001-01-01` means "since ever". */
export type PercentVersion = { fromMonth: string; percentMicro: number };

/** Percent of the version with the greatest `fromMonth` <= `monthStart`; null when none applies. */
export function resolvePercent(versions: PercentVersion[], monthStart: string): number | null {
  let best: PercentVersion | null = null;
  for (const v of versions) {
    if (v.fromMonth <= monthStart && (best === null || v.fromMonth > best.fromMonth)) best = v;
  }
  return best ? best.percentMicro : null;
}

/** First day of the month as AAAA-MM-01. */
export function monthStartOf(m: YearMonth): string {
  return monthRange(m).start;
}
