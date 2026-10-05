import { currentMonth, type YearMonth } from "./month";

export type YearMonthDay = { year: number; month: number; day: number };

/** Taxas anuais oferecidas, em pontos-base: conservador 6%, moderado 8%, agressivo 10%. */
export const ANNUAL_RATES = [600, 800, 1000] as const;
export type AnnualRateBp = (typeof ANNUAL_RATES)[number];
export const DEFAULT_ANNUAL_RATE_BP: AnnualRateBp = 800;

/** Taxa mensal efetiva equivalente à taxa anual: (1 + taxa)^(1/12) − 1. */
export function monthlyRate(annualRateBp: number): number {
  return (1 + annualRateBp / 10_000) ** (1 / 12) - 1;
}

/** Patrimônio-alvo por perpetuidade: renda mensal × 12 ÷ taxa anual (6%, 8% e 10% dão × 200, × 150 e × 120; sempre inteiro). */
export function targetCents(monthlyIncomeCents: number, annualRateBp: number): number {
  return (monthlyIncomeCents * 12 * 10_000) / annualRateBp;
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

/**
 * Aporte mensal (fim de mês) que leva `savedCents` ao alvo em `months` meses, arredondado para cima
 * ao centavo; 0 se o guardado capitalizado já alcança o alvo. Não definido para `months = 0`.
 */
export function requiredMonthlyCents(input: {
  targetCents: number;
  savedCents: number;
  months: number;
  annualRateBp: number;
}): number {
  const rate = monthlyRate(input.annualRateBp);
  const growth = (1 + rate) ** input.months;
  const gap = input.targetCents - input.savedCents * growth;
  if (gap <= 0) return 0;
  const payment = (gap * rate) / (growth - 1);
  // A tolerância evita subir 1 centavo por erro de ponto flutuante quando o valor é exato.
  return Math.ceil(payment - 1e-6);
}

export type Goal = {
  monthlyIncomeCents: number;
  savedCents: number;
  birthDate: string;
  retirementAge: number;
  annualRateBp: AnnualRateBp;
};

export type TimelinePoint = {
  /** Meses a partir de hoje. */
  months: number;
  /** Idade fracionária (eixo do gráfico). */
  age: number;
  /** Idade em anos completos. */
  ageYears: number;
  investedCents: number;
  interestCents: number;
  totalCents: number;
};

/** Patrimônio projetado em `m` meses: guardado × (1+i)^m + aporte × ((1+i)^m − 1) ÷ i, ao centavo. */
export function projectedCents(
  input: { savedCents: number; monthlyCents: number; annualRateBp: number },
  m: number,
): number {
  const rate = monthlyRate(input.annualRateBp);
  const growth = (1 + rate) ** m;
  return Math.round(input.savedCents * growth + (input.monthlyCents * (growth - 1)) / rate);
}

/**
 * Evolução do patrimônio pagando o aporte necessário: um ponto por ano completo a partir de hoje
 * (meses 0, 12, 24 …) e um ponto final no prazo. Vazia sem prazo ou sem aporte definido.
 */
export function projectTimeline(input: {
  savedCents: number;
  months: number;
  monthlyCents: number | null;
  retirementAge: number;
  annualRateBp: number;
}): TimelinePoint[] {
  const { savedCents, months, monthlyCents, retirementAge, annualRateBp } = input;
  if (monthlyCents === null || months === 0) return [];

  const marks: number[] = [];
  for (let m = 0; m < months; m += 12) marks.push(m);
  marks.push(months);

  return marks.map((m) => {
    const totalCents = projectedCents({ savedCents, monthlyCents, annualRateBp }, m);
    const investedCents = savedCents + monthlyCents * m;
    return {
      months: m,
      age: retirementAge - (months - m) / 12,
      ageYears: retirementAge - Math.ceil((months - m) / 12),
      investedCents,
      interestCents: totalCents - investedCents,
      totalCents,
    };
  });
}

/** Participação dos rendimentos no patrimônio do último ponto, em % inteiro; `null` sem pontos. */
export function interestSharePct(timeline: TimelinePoint[]): number | null {
  const last = timeline.at(-1);
  return last ? Math.round((last.interestCents * 100) / last.totalCents) : null;
}

/** Participação de investido e rendimentos no patrimônio, em % inteiros somando 100; `null` sem patrimônio. */
export function compositionShares(
  investedCents: number,
  totalCents: number,
): { investedPct: number; interestPct: number } | null {
  if (totalCents <= 0) return null;
  const investedPct = Math.round((investedCents * 100) / totalCents);
  return { investedPct, interestPct: 100 - investedPct };
}

/** Teto do eixo Y do gráfico: 107% do maior valor entre o alvo e o patrimônio final, em centavos inteiros. */
export function chartYMax(targetCents: number, finalCents: number): number {
  return Math.round((Math.max(targetCents, finalCents) * 107) / 100);
}

export type Checkpoint = {
  /** Fração do alvo em pontos-base: 2500, 5000, 7500 ou 10000. */
  fractionBp: number;
  valueCents: number;
  /** Guardado já alcança o valor. */
  reached: boolean;
  /** Mês em que o valor projetado o alcança; nulo se atingido ou sem prazo. */
  months: number | null;
  /** Idade em anos completos nessa data; nulo quando `months` é nulo. */
  ageYears: number | null;
  /** Posição na barra em pontos-base (a própria fração). */
  positionBp: number;
};

const CHECKPOINT_FRACTIONS_BP = [2500, 5000, 7500, 10_000];

/**
 * Checkpoints em 25%, 50%, 75% e 100% do alvo. Os não atingidos ganham a previsão: o menor mês em
 * que o valor projetado (pagando o aporte necessário) alcança o checkpoint; o de 100% cai no prazo.
 */
export function buildCheckpoints(input: {
  targetCents: number;
  savedCents: number;
  months: number;
  monthlyCents: number | null;
  retirementAge: number;
  annualRateBp: number;
}): Checkpoint[] {
  const { targetCents: target, savedCents, months, monthlyCents, retirementAge, annualRateBp } = input;

  return CHECKPOINT_FRACTIONS_BP.map((fractionBp) => {
    const valueCents = Math.round((target * fractionBp) / 10_000);
    const reached = savedCents >= valueCents;
    let forecast: number | null = null;
    if (!reached && months > 0 && monthlyCents !== null) {
      forecast = months;
      if (fractionBp < 10_000) {
        for (let m = 1; m < months; m++) {
          if (projectedCents({ savedCents, monthlyCents, annualRateBp }, m) >= valueCents) {
            forecast = m;
            break;
          }
        }
      }
    }
    return {
      fractionBp,
      valueCents,
      reached,
      months: forecast,
      ageYears: forecast === null ? null : retirementAge - Math.ceil((months - forecast) / 12),
      positionBp: fractionBp,
    };
  });
}

export type GoalSummary = {
  monthlyIncomeCents: number;
  annualRateBp: AnnualRateBp;
  targetCents: number;
  savedCents: number;
  remainingCents: number;
  progressBp: number;
  months: number;
  /** `null` quando o prazo acabou e o guardado ainda não alcança o alvo ("Prazo encerrado"). */
  monthlyCents: number | null;
  timeline: TimelinePoint[];
  interestSharePct: number | null;
  checkpoints: Checkpoint[];
};

/** Resumo calculado na leitura a partir do objetivo salvo e de `now`. */
export function summarize(goal: Goal, now: Date): GoalSummary {
  const target = targetCents(goal.monthlyIncomeCents, goal.annualRateBp);
  const months = monthsUntilRetirement(goal.birthDate, goal.retirementAge, currentMonth(now));
  const reached = goal.savedCents >= target;

  let monthlyCents: number | null;
  if (months === 0) monthlyCents = reached ? 0 : null;
  else {
    monthlyCents = requiredMonthlyCents({
      targetCents: target,
      savedCents: goal.savedCents,
      months,
      annualRateBp: goal.annualRateBp,
    });
  }

  const timeline = projectTimeline({
    savedCents: goal.savedCents,
    months,
    monthlyCents,
    retirementAge: goal.retirementAge,
    annualRateBp: goal.annualRateBp,
  });

  return {
    monthlyIncomeCents: goal.monthlyIncomeCents,
    annualRateBp: goal.annualRateBp,
    targetCents: target,
    savedCents: goal.savedCents,
    remainingCents: Math.max(0, target - goal.savedCents),
    progressBp: progressBp(goal.savedCents, target),
    months,
    monthlyCents,
    timeline,
    interestSharePct: interestSharePct(timeline),
    checkpoints: buildCheckpoints({
      targetCents: target,
      savedCents: goal.savedCents,
      months,
      monthlyCents,
      retirementAge: goal.retirementAge,
      annualRateBp: goal.annualRateBp,
    }),
  };
}
