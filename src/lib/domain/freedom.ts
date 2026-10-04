import { currentMonth, type YearMonth } from "./month";

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

/** Taxa mensal efetiva equivalente a 8% ao ano: 1,08^(1/12) − 1. */
const MONTHLY_RATE = (1 + ANNUAL_RATE_BP / 10_000) ** (1 / 12) - 1;

/**
 * Aporte mensal (fim de mês) que leva `savedCents` ao alvo em `months` meses, arredondado para cima
 * ao centavo; 0 se o guardado capitalizado já alcança o alvo. Não definido para `months = 0`.
 */
export function requiredMonthlyCents(input: {
  targetCents: number;
  savedCents: number;
  months: number;
}): number {
  const growth = (1 + MONTHLY_RATE) ** input.months;
  const gap = input.targetCents - input.savedCents * growth;
  if (gap <= 0) return 0;
  const payment = (gap * MONTHLY_RATE) / (growth - 1);
  // A tolerância evita subir 1 centavo por erro de ponto flutuante quando o valor é exato.
  return Math.ceil(payment - 1e-6);
}

export type Goal = {
  monthlyIncomeCents: number;
  savedCents: number;
  birthDate: string;
  retirementAge: number;
};

export type GoalSummary = {
  targetCents: number;
  savedCents: number;
  remainingCents: number;
  progressBp: number;
  months: number;
  /** `null` quando o prazo acabou e o guardado ainda não alcança o alvo ("Prazo encerrado"). */
  monthlyCents: number | null;
};

/** Resumo calculado na leitura a partir do objetivo salvo e de `now`. */
export function summarize(goal: Goal, now: Date): GoalSummary {
  const target = targetCents(goal.monthlyIncomeCents);
  const months = monthsUntilRetirement(goal.birthDate, goal.retirementAge, currentMonth(now));
  const reached = goal.savedCents >= target;

  let monthlyCents: number | null;
  if (months === 0) monthlyCents = reached ? 0 : null;
  else monthlyCents = requiredMonthlyCents({ targetCents: target, savedCents: goal.savedCents, months });

  return {
    targetCents: target,
    savedCents: goal.savedCents,
    remainingCents: Math.max(0, target - goal.savedCents),
    progressBp: progressBp(goal.savedCents, target),
    months,
    monthlyCents,
  };
}
