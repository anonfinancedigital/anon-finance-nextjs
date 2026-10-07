import type { GoalSummary } from "./freedom";

/** Opções da folga; cada uma é `null` quando não se aplica. */
export type SlackOptions = {
  /** Renda mensal que o patrimônio do prazo sustenta, em reais inteiros (para baixo). */
  extraIncomeCents: number | null;
  /** Idade da meta N, quando é menor que a idade-alvo. */
  earlierAge: number | null;
};

/**
 * Opções da folga quando o guardado, rendendo sem aportes, alcança o alvo antes do prazo. A renda extra
 * só aparece se for pelo menos 5% maior que a desejada.
 */
export function slackOptions(summary: GoalSummary): SlackOptions {
  const { reach } = summary;
  if (!reach) return { extraIncomeCents: null, earlierAge: null };
  const extraIncomeCents = Math.floor((reach.finalCents * summary.withdrawalRateBp) / 10_000 / 12 / 100) * 100;
  return {
    extraIncomeCents: extraIncomeCents * 100 >= summary.monthlyIncomeCents * 105 ? extraIncomeCents : null,
    earlierAge: reach.ageYears < summary.retirementAge ? reach.ageYears : null,
  };
}
