export type YearMonth = { year: number; month: number };

const saoPaulo = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
});

/** Calendar month of `now` in America/Sao_Paulo. */
export function currentMonth(now: Date): YearMonth {
  const parts = saoPaulo.formatToParts(now);
  const get = (type: "year" | "month") => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month") };
}

/** Parses `?mes=AAAA-MM`; anything invalid or missing resolves to the current month. */
export function parseMonth(param: string | undefined, now: Date): YearMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year: Number(match[1]), month };
  }
  return currentMonth(now);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO date bounds of the month, for `date >= start AND date < endExclusive`. */
export function monthRange(m: YearMonth): { start: string; endExclusive: string } {
  const next = m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 };
  return {
    start: `${m.year}-${pad(m.month)}-01`,
    endExclusive: `${next.year}-${pad(next.month)}-01`,
  };
}

/** True only for a real calendar day written as AAAA-MM-DD. */
export function isValidCalendarDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Link to a month (`AAAA-MM`) that keeps every other URL parameter, e.g. the list filters. */
export function monthHref(current: URLSearchParams | string, month: string): string {
  const next = new URLSearchParams(current);
  next.set("mes", month);
  return `/?${next.toString()}`;
}
