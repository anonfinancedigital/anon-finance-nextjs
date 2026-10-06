import type { Checkpoint, GoalSummary } from "./freedom";
import { formatBRL } from "./money";

/** Título do seletor de cenários e nome acessível do radiogroup. */
export const RATE_TITLE = "Rentabilidade real esperada";

/** Legenda do seletor de cenários. */
export const RATE_HINT = "Taxa real estimada (descontada a inflação)";

/** Parágrafos do "Como calculamos?". */
export const HOW_WE_CALCULATE = [
  "A rentabilidade real representa o crescimento estimado do patrimônio acima da inflação. A taxa de retirada representa a parcela anual do patrimônio utilizada para gerar a renda desejada.",
  "A taxa de retirada varia conforme o cenário escolhido e é menor que a rentabilidade real. O patrimônio necessário é a renda anual desejada dividida pela taxa de retirada.",
  "Os valores são premissas de simulação, não promessa de renda nem de retorno.",
];

/** Título do popover do "Como calculamos?". */
export const HOW_TITLE = "Como chegamos a esse número:";

/** Aviso do popover do "Como calculamos?". */
export const HOW_DISCLAIMER =
  "Simulação com base em rentabilidade real (líquida de inflação). Não representa garantia de rendimentos.";

/** Taxa em pt-BR, sem zeros à direita: 600 -> "6%", 650 -> "6,5%". */
export function formatRate(bp: number): string {
  return `${(bp / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

const perYear = (bp: number) => `${formatRate(bp)} a.a.`;

/** Pílula do card de Meta: a renda que o patrimônio gera e a retirada usada. */
export function heroPill(summary: GoalSummary): string {
  return `Gera ${formatBRL(summary.monthlyIncomeCents)}/mês com retirada de ${perYear(summary.withdrawalRateBp)}`;
}

/** Linhas de apoio do Hero: rentabilidade, retirada, renda e patrimônio necessário, todos do resumo. */
export function heroFacts(summary: GoalSummary): { label: string; value: string }[] {
  return [
    { label: "Rentabilidade real", value: perYear(summary.annualRateBp) },
    { label: "Taxa de retirada", value: perYear(summary.withdrawalRateBp) },
    { label: "Renda desejada", value: `${formatBRL(summary.monthlyIncomeCents)}/mês` },
    { label: "Patrimônio necessário", value: formatBRL(summary.targetCents) },
  ];
}

/** Rótulo curto do marco: "Atingido", "Sem previsão", "Aos N anos" e, no último, "Aos N anos (Meta)". */
export function checkpointLabel(checkpoint: Checkpoint, isLast: boolean): string {
  if (checkpoint.reached) return "Atingido";
  if (checkpoint.ageYears === null) return "Sem previsão";
  return isLast ? `Aos ${checkpoint.ageYears} anos (Meta)` : `Aos ${checkpoint.ageYears} anos`;
}

/** Frase do popover: renda mensal e anual, retirada e o patrimônio necessário, todos do resumo. */
export function howWeCalculate(summary: GoalSummary): string {
  return `Com uma renda de ${formatBRL(summary.monthlyIncomeCents)}/mês (${formatBRL(summary.monthlyIncomeCents * 12)}/ano) e uma taxa de retirada segura de ${perYear(summary.withdrawalRateBp)}, seu patrimônio precisa ser de ${formatBRL(summary.targetCents)} para perpetuar a renda sem consumir o principal investido.`;
}
