import { allocateCents } from "./budget";
import { formatBRL } from "./money";
import { sumLabel, TOTAL_MICRO } from "./percent";

/** Warning for a category sum that is not 100%, with the gap in R$ when there is a reference income and the gap is at least R$ 0,01. */
export function sumWarning(sumMicro: number, incomeCents: number | null): string {
  const base = `A soma deve ser 100%. Atual: ${sumLabel(sumMicro)}`;
  if (incomeCents === null) return base;
  const diffCents = allocateCents(incomeCents, Math.abs(TOTAL_MICRO - sumMicro));
  if (diffCents === 0) return base;
  const sign = sumMicro > TOTAL_MICRO ? "+" : "-";
  return `${base} (${sign}${formatBRL(diffCents).replace(/ /g, " ")})`;
}
