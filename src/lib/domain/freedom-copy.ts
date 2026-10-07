import { presetFor, type Checkpoint, type GoalSummary } from "./freedom";
import { formatBRL, formatCompactBRL, formatWholeBRL } from "./money";
import { formatShare } from "./percent";
import type { RobustnessCheck } from "./slack";

/** Subtítulo da página, sob o título "Ápice". */
export const SUBTITLE = "Quanto você precisa juntar para viver de renda — e quanto guardar por mês para chegar lá.";

/** Descrição da gaveta de ajuste. */
export const DRAWER_INTRO = "Altere os valores e veja o aporte mensal mudar na hora.";

/** Botão e título da gaveta. */
export const ADJUST_LABEL = "Ajustar objetivo";

/** Rótulo do indicador de aporte. */
export const DEPOSIT_LABEL = "Aporte mensal necessário";

/** Rótulo do indicador de patrimônio. */
export const TARGET_LABEL = "Patrimônio necessário";

/** Título do seletor de cenários e nome acessível do radiogroup. */
export const RATE_TITLE = "Rentabilidade real esperada";

/** Legenda do seletor de cenários. */
export const RATE_HINT = "Taxa real estimada (descontada a inflação)";

/** Título do popover do "Como calculamos?". */
export const HOW_TITLE = "Como chegamos a esse número:";

/** Aviso do popover do "Como calculamos?". */
export const HOW_DISCLAIMER =
  "A simulação utiliza rentabilidade real, já descontada da inflação. Os valores são projeções e não representam garantia de rentabilidade ou de renda futura.";

/** Taxa em pt-BR, sem zeros à direita: 600 -> "6%", 650 -> "6,5%". */
export function formatRate(bp: number): string {
  return `${(bp / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

const perYear = (bp: number) => `${formatRate(bp)} a.a.`;

/** Renda desejada do card principal: "R$ 20 mil/mês aos 48 anos". */
export function incomeHeadline(summary: GoalSummary): string {
  return `${formatCompactBRL(summary.monthlyIncomeCents)}/mês aos ${summary.retirementAge} anos`;
}

/**
 * Frase-resumo: renda, idade e patrimônio necessário e, quando há aporte, quanto guardar e por quanto
 * tempo. Prazo encerrado (aporte nulo) omite a cláusula; guardado já no alvo a troca por "Você já atingiu
 * seu Ápice."; aporte 0 com guardado abaixo do alvo diz a idade em que o patrimônio atual chega lá.
 */
export function summarySentence(summary: GoalSummary): string {
  const base = `Para ter ${incomeHeadline(summary)}, você precisa de ${formatCompactBRL(summary.targetCents)}.`;
  if (summary.remainingCents === 0) return `${base} Você já atingiu seu Ápice.`;
  if (summary.monthlyCents === null) return base;
  if (summary.reach) {
    return `${base} Seu patrimônio atual, rendendo, chega lá aos ${summary.reach.ageYears}, sem novos aportes.`;
  }
  return `${base} Isso exige guardar ${formatWholeBRL(summary.monthlyCents)}/mês por ${formatTerm(summary.months)}.`;
}

/**
 * Valor do indicador de aporte: "R$ 9.027/mês", "Prazo encerrado", "R$ 0" (o guardado rendendo já
 * alcança o alvo) ou "Meta alcançada" (o guardado já está no alvo).
 */
export function depositText(summary: GoalSummary): string {
  if (summary.monthlyCents === null) return "Prazo encerrado";
  if (summary.remainingCents === 0) return PLAN_REACHED;
  if (summary.monthlyCents === 0) return formatWholeBRL(0);
  return `${formatWholeBRL(summary.monthlyCents)}/mês`;
}

export type ScenarioName = "conservador" | "moderado" | "agressivo" | "personalizado";

/** Par de taxas que define as premissas; o resumo e o rascunho sem resumo têm os dois. */
export type Premises = Pick<GoalSummary, "annualRateBp" | "withdrawalRateBp">;

const SCENARIO_BY_PRESET: Record<number, ScenarioName> = { 600: "conservador", 800: "moderado", 1000: "agressivo" };

/** Nome do cenário pelo par (rentabilidade, retirada) do resumo; "personalizado" fora dos presets. */
export function scenarioName(rates: Premises): ScenarioName {
  const preset = presetFor(rates.annualRateBp, rates.withdrawalRateBp);
  return preset === null ? "personalizado" : SCENARIO_BY_PRESET[preset];
}

/** Os quatro chips de premissas da página. */
export function assumptionChips(premises: Premises): {
  scenario: string;
  rate: string;
  withdrawal: string;
  today: string;
} {
  return {
    scenario: `Cenário ${scenarioName(premises)}`,
    rate: `${formatRate(premises.annualRateBp)} real a.a.`,
    withdrawal: `Retirada de ${perYear(premises.withdrawalRateBp)}`,
    today: "Valores em R$ de hoje",
  };
}

/** Tooltip do chip "Valores em R$ de hoje". */
export const TODAY_TOOLTIP = "Todos os valores já descontam a inflação.";

/** O que a taxa de retirada significa; abre o tooltip da retirada e o substitui sem resumo. */
export const WITHDRAWAL_EXPLANATION = "Percentual do patrimônio que você saca por ano para gerar sua renda.";

/** Tooltip da retirada: o que a taxa significa, com um exemplo calculado dos valores dados. */
export function withdrawalTooltip(input: {
  withdrawalBp: number;
  targetCents: number;
  monthlyIncomeCents: number;
}): string {
  return `${WITHDRAWAL_EXPLANATION} Com ${formatRate(input.withdrawalBp)}, ${formatCompactBRL(input.targetCents)} geram ${formatCompactBRL(input.monthlyIncomeCents * 12)}/ano (${formatCompactBRL(input.monthlyIncomeCents)}/mês).`;
}

/** Rótulo do ponto "Hoje" na barra de marcos, com o percentual real do progresso (sem teto). */
export function todayLabel(summary: GoalSummary): string {
  return `Hoje · ${formatCompactBRL(summary.savedCents)} (${formatShare(summary.progressBp)}) · ${summary.currentAge} anos`;
}

/**
 * Variação do aporte da prévia sobre o salvo, em reais inteiros: "R$ 1.240 vs. atual" com a direção.
 * `null` sem um dos lados ou quando a diferença não chega a R$ 1.
 */
export function depositDelta(
  previewCents: number | null,
  savedCents: number | null,
): { direction: "up" | "down"; text: string } | null {
  if (previewCents === null || savedCents === null) return null;
  const diff = previewCents - savedCents;
  if (Math.round(Math.abs(diff) / 100) === 0) return null;
  return { direction: diff > 0 ? "up" : "down", text: `${formatWholeBRL(Math.abs(diff))} vs. atual` };
}

/** Rótulo curto do marco: "Atingido", "Sem previsão", "Aos N anos" e, no último, "Aos N anos (Meta)". */
export function checkpointLabel(checkpoint: Checkpoint, isLast: boolean): string {
  if (checkpoint.reached) return "Atingido";
  if (checkpoint.ageYears === null) return "Sem previsão";
  return isLast ? `Aos ${checkpoint.ageYears} anos (Meta)` : `Aos ${checkpoint.ageYears} anos`;
}

/** Frase do popover: renda mensal e anual, retirada inicial e o patrimônio-alvo, todos do resumo. */
export function howWeCalculate(summary: GoalSummary): string {
  return `Com uma renda de ${formatBRL(summary.monthlyIncomeCents)}/mês (${formatBRL(summary.monthlyIncomeCents * 12)}/ano) e uma taxa de retirada inicial de ${perYear(summary.withdrawalRateBp)}, o patrimônio-alvo é de ${formatBRL(summary.targetCents)}.`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 ano e 2 meses", "3 anos", "5 meses"; "0 meses" quando não resta prazo. */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, "mês", "meses");
  if (rest === 0) return plural(years, "ano", "anos");
  return `${plural(years, "ano", "anos")} e ${plural(rest, "mês", "meses")}`;
}

/** Linha do card de aporte quando o guardado já está na meta. */
export const PLAN_REACHED = "Meta alcançada";

/** Linha do card de aporte com plano de chegada: idade da meta e quanto antes do previsto; `null` sem plano. */
export function reachLine(summary: GoalSummary): string | null {
  if (!summary.reach) return null;
  const { ageYears } = summary.reach;
  const early = summary.retirementAge - ageYears;
  const when = early === 0 ? "no prazo previsto" : `${plural(early, "ano", "anos")} antes do previsto`;
  return `Seu patrimônio atual já te leva lá: você atinge a meta aos ${ageYears} anos, ${when}.`;
}

/** Linha do card de aporte quando o guardado já está no alvo: a renda que ele gera hoje. */
export function incomeNowLine(summary: GoalSummary): string {
  return `Seu patrimônio já gera ${formatCompactBRL(summary.incomeNowCents)}/mês`;
}

/** Título do bloco de folga. */
export const SLACK_TITLE = "Você tem folga";

/** Nome da opção de renda extra. */
export const EXTRA_INCOME_TITLE = "Ter mais renda";

/** Nome da opção de antecipar a idade. */
export const EARLIER_TITLE = "Parar antes";

/** Primeira linha do bloco de folga: o patrimônio no prazo sem aportes; `null` sem plano de chegada. */
export function slackIntro(summary: GoalSummary): string | null {
  if (!summary.reach) return null;
  return `Sem novos aportes, aos ${summary.retirementAge} anos seu patrimônio chega a ${formatCompactBRL(summary.reach.finalCents)}.`;
}

/** Opção "Ter mais renda": resultado e rótulo do botão. */
export function extraIncomeOption(summary: GoalSummary, extraIncomeCents: number): { result: string; button: string } {
  const income = formatCompactBRL(extraIncomeCents);
  return { result: `${income}/mês aos ${summary.retirementAge} anos`, button: `Usar ${income}` };
}

/** Opção "Parar antes": resultado e rótulo do botão. */
export function earlierOption(summary: GoalSummary, earlierAge: number): { result: string; button: string } {
  return {
    result: `${formatCompactBRL(summary.monthlyIncomeCents)}/mês aos ${earlierAge} anos`,
    button: `Antecipar para ${earlierAge}`,
  };
}

/** Linha do teste de robustez a 6% real a.a. */
export function robustnessText(check: RobustnessCheck): string {
  if (check.reaches) {
    return "Mesmo com 6% real a.a., você chega à meta. Isso considera que você não retira nada do patrimônio até lá.";
  }
  return `Com 6% real a.a., seria preciso aportar ${formatWholeBRL(check.monthlyCents)}/mês.`;
}

/**
 * Pílula do gráfico: rendimentos do último ponto (compacto) e a participação deles no patrimônio
 * final; só o valor quando não há percentual; `null` sem linha do tempo.
 */
export function interestBadge(summary: GoalSummary): string | null {
  const last = summary.timeline.at(-1);
  if (!last) return null;
  const amount = `${formatCompactBRL(last.interestCents)} vêm dos rendimentos`;
  return summary.interestSharePct === null ? amount : `${amount} · ${summary.interestSharePct}% do patrimônio final`;
}
