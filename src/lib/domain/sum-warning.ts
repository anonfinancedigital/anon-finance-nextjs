import { allocateCents } from "./budget";
import { formatBRL } from "./money";
import { formatPercent, formatPercentFixed, TOTAL_MICRO } from "./percent";

export type SumGap = {
  direction: "over" | "under" | "exact";
  /** The gap alone, e.g. "4,96%"; empty when the sum is exactly 100%. */
  percent: string;
  /** "Passou 1,10% (+R$ 200,00)" / "Faltam 5,00% (R$ 900,00 para distribuir)"; empty when the sum is exactly 100%. */
  text: string;
};

/** The gap in percent: two decimals, except one that would show as "0,00" (a few micro-percent), which keeps up to 6. */
function gapPercent(diffMicro: number): string {
  const label = formatPercentFixed(diffMicro);
  return label === "0,00" ? formatPercent(diffMicro) : `${label}%`;
}

/**
 * How far a category sum is from 100%: its direction and a sentence with the gap in percent, plus R$ when
 * there is a reference income and the gap is at least R$ 0,01.
 */
export function sumGap(sumMicro: number, incomeCents: number | null): SumGap {
  if (sumMicro === TOTAL_MICRO) return { direction: "exact", percent: "", text: "" };
  const over = sumMicro > TOTAL_MICRO;
  const diffMicro = Math.abs(TOTAL_MICRO - sumMicro);
  const percent = gapPercent(diffMicro);
  const base = `${over ? "Passou" : "Faltam"} ${percent}`;
  const direction = over ? "over" : "under";
  if (incomeCents === null) return { direction, percent, text: base };
  const diffCents = allocateCents(incomeCents, diffMicro);
  if (diffCents === 0) return { direction, percent, text: base };
  const amount = formatBRL(diffCents).replace(/\u00a0/g, " ");
  return { direction, percent, text: over ? `${base} (+${amount})` : `${base} (${amount} para distribuir)` };
}
