import type { YearMonth } from "./month";

export type YearMonthDay = { year: number; month: number; day: number };

/** Taxa anual fixa, em pontos-base (8% = 800). */
export const ANNUAL_RATE_BP = 800;

/** Patrimônio-alvo por perpetuidade: renda mensal × 12 ÷ taxa anual (com 8%, × 150; sempre inteiro). */
export function targetCents(monthlyIncomeCents: number): number {
  return (monthlyIncomeCents * 12 * 10_000) / ANNUAL_RATE_BP;
}

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

function parseIsoDate(iso: string): YearMonthDay {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** Idade em anos completos em `today`; aniversário de 29/02 cai em 28/02 nos anos não bissextos. */
export function ageOn(birthDate: string, today: YearMonthDay): number {
  const birth = parseIsoDate(birthDate);
  const birthdayDay = birth.month === 2 && birth.day === 29 && !isLeapYear(today.year) ? 28 : birth.day;
  const beforeBirthday =
    today.month < birth.month || (today.month === birth.month && today.day < birthdayDay);
  return today.year - birth.year - (beforeBirthday ? 1 : 0);
}

/** Meses de calendário até o mês do aniversário em que se completa `retirementAge`; nunca negativo. */
export function monthsUntilRetirement(birthDate: string, retirementAge: number, now: YearMonth): number {
  const birth = parseIsoDate(birthDate);
  return Math.max(0, (birth.year + retirementAge - now.year) * 12 + (birth.month - now.month));
}

/** Progresso em pontos-base (1% = 100), sem teto: a UI limita a barra. */
export function progressBp(savedCents: number, targetCents: number): number {
  return Math.round((savedCents * 10_000) / targetCents);
}
