import type { Checkpoint, GoalSummary } from "./freedom";
import { formatBRL } from "./money";

/** Título do seletor de cenários e nome acessível do radiogroup. */
export const RATE_TITLE = "Rentabilidade real esperada";

/** Legenda do seletor de cenários. */
export const RATE_HINT = "Taxa real estimada (descontada a inflação)";

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
