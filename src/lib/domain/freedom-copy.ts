import type { Checkpoint, GoalSummary } from "./freedom";
import { formatBRL, formatCompactBRL, formatWholeBRL } from "./money";

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

/** Pílula do card de Meta: a renda desejada e a retirada inicial usada. */
export function heroPill(summary: GoalSummary): string {
  return `Renda de ${formatBRL(summary.monthlyIncomeCents)}/mês · retirada inicial de ${perYear(summary.withdrawalRateBp)}`;
}

/** Renda desejada do card principal: "R$ 20 mil/mês aos 48 anos". */
export function incomeHeadline(summary: GoalSummary): string {
  return `${formatCompactBRL(summary.monthlyIncomeCents)}/mês aos ${summary.retirementAge} anos`;
}

/**
 * Frase-resumo: renda, idade e patrimônio necessário e, quando há aporte, quanto guardar e por quanto
 * tempo. Prazo encerrado (aporte nulo) omite a cláusula; meta já alcançada (aporte 0) a troca por
 * "Você já tem o necessário.".
 */
export function summarySentence(summary: GoalSummary): string {
  const base = `Para ter ${incomeHeadline(summary)}, você precisa de ${formatCompactBRL(summary.targetCents)}.`;
  if (summary.monthlyCents === null) return base;
  if (summary.monthlyCents === 0) return `${base} Você já tem o necessário.`;
  return `${base} Isso exige guardar ${formatWholeBRL(summary.monthlyCents)}/mês por ${formatTerm(summary.months)}.`;
}

/** Valor do indicador de aporte: "R$ 9.027/mês", "Prazo encerrado" ou "Meta alcançada". */
export function depositText(summary: GoalSummary): string {
  if (summary.monthlyCents === null) return "Prazo encerrado";
  if (summary.monthlyCents === 0) return PLAN_REACHED;
  return `${formatWholeBRL(summary.monthlyCents)}/mês`;
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

/** Linha do card de aporte quando o prazo acabou com o guardado na meta. */
export const PLAN_REACHED = "Meta alcançada";

/**
 * Linhas sob o aporte mensal. Com prazo: a meta compacta com a idade do ápice e o tempo até lá.
 * Sem prazo: `{ reached: true }` se o aporte é 0 (meta alcançada); `null` no prazo encerrado.
 */
export function planLines(summary: GoalSummary): { reach: string; term: string } | { reached: true } | null {
  if (summary.months > 0) {
    return {
      reach: `para alcançar ${formatCompactBRL(summary.targetCents)} aos ${summary.retirementAge} anos`,
      term: `Você chega ao Ápice em: ${formatTerm(summary.months)}`,
    };
  }
  return summary.monthlyCents === 0 ? { reached: true } : null;
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
