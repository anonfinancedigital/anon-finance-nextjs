import { isValidCalendarDate } from "./month";

/** "1993-09-18" → "18/09/1993". */
export function isoToBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Parses "DD/MM/AAAA" into "AAAA-MM-DD"; `null` for another format or a date that does not exist. */
export function brToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isValidCalendarDate(iso) ? iso : null;
}

/** Masks typed text as "DD/MM/AAAA": keeps the first 8 digits and inserts the slashes. */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
