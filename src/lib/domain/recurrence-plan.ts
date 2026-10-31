import { formatBRL } from "./money";
import { shiftMonth, type YearMonth } from "./month";
import { monthLongName } from "./onboarding";

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10" → { year: 2026, month: 10 }; null when it is not a valid AAAA-MM. */
export function parseMonthKey(key: string): YearMonth | null {
  const match = MONTH_KEY.exec(key);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

const toKey = ({ year, month }: YearMonth) => `${year}-${String(month).padStart(2, "0")}`;

/** The month `delta` months after (or before) `key`, as AAAA-MM; null when `key` is not valid. */
export function addMonths(key: string, delta: number): string | null {
  const parsed = parseMonthKey(key);
  return parsed ? toKey(shiftMonth(parsed, delta)) : null;
}

/** Number of monthly occurrences from `start` to `end`, both included; null when either is invalid or `end` is earlier. */
export function installmentCount(start: string, end: string): number | null {
  const from = parseMonthKey(start);
  const to = parseMonthKey(end);
  if (!from || !to) return null;
  const count = (to.year - from.year) * 12 + (to.month - from.month) + 1;
  return count >= 1 ? count : null;
}

/** Last month of a series of `count` occurrences starting at `start`; null for an invalid start or a count below 1. */
export function endForInstallments(start: string, count: number): string | null {
  return count >= 1 ? addMonths(start, count - 1) : null;
}

/** "2026-11" → "nov/2026". */
export function formatMonthShort(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return `${monthLongName(parsed).slice(0, 3)}/${parsed.year}`;
}

/** "2026-10" → "outubro de 2026". */
export function formatMonthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  return parsed ? `${monthLongName(parsed)} de ${parsed.year}` : key;
}

/**
 * One line that confirms a period series before saving, e.g. "12 parcelas · nov/2026 a out/2027 · 12 × R$ 150,00 =
 * R$ 1.800,00". Each occurrence repeats the amount, so the total is count × amount. The amount part is left out
 * without a valid amount. Null when the period is not valid.
 */
export function recurrenceSummary({
  start,
  end,
  amountCents,
}: {
  start: string;
  end: string;
  amountCents: number | null;
}): string | null {
  const count = installmentCount(start, end);
  if (count === null) return null;
  const parts = [`${count} ${count === 1 ? "parcela" : "parcelas"}`, `${formatMonthShort(start)} a ${formatMonthShort(end)}`];
  if (amountCents !== null) {
    parts.push(`${count} × ${formatBRL(amountCents)} = ${formatBRL(count * amountCents)}`);
  }
  return parts.join(" · ").replace(/ /g, " ");
}
