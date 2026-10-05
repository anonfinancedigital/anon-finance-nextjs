import type { Result } from "./result";

/** Category percentages are stored in micro-percent: 1% = 1_000_000, so 100% = TOTAL_MICRO. */
export const MICRO_PER_PERCENT = 1_000_000;
export const TOTAL_MICRO = 100 * MICRO_PER_PERCENT;

const PERCENT_PATTERN = /^(\d+)(?:,(\d{1,6}))?$/;

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 });
const share = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ADJUST_OUT_OF_RANGE =
  "Não é possível ajustar esta categoria: o percentual ficaria fora do intervalo de 0,000001% a 100%";
const OUT_OF_RANGE = "O percentual deve estar entre 0,000001 e 100";

/** round(a × b / divisor) for non-negative integers, exact even when a × b exceeds 2^53. */
export function mulDivRound(a: number, b: number, divisor: number): number {
  const d = BigInt(divisor);
  return Number((BigInt(a) * BigInt(b) * BigInt(2) + d) / (d * BigInt(2)));
}

/** Parses a pt-BR percentage ("12,5") into integer micro-percent (1% = 1_000_000). */
export function parsePercent(input: string): Result<number> {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Informe o percentual" };

  const match = PERCENT_PATTERN.exec(text);
  if (!match) {
    return { ok: false, error: "Percentual inválido. Use um número com até 6 casas decimais" };
  }

  const micro = Number(match[1]) * MICRO_PER_PERCENT + Number((match[2] ?? "").padEnd(6, "0"));
  if (micro < 1 || micro > TOTAL_MICRO) return { ok: false, error: OUT_OF_RANGE };
  return { ok: true, value: micro };
}

/** Converts an amount into the micro-percent it represents of an income; 0 and above-income amounts are out of range. */
export function microFromCents(cents: number, incomeCents: number): Result<number> {
  const micro = incomeCents > 0 ? mulDivRound(cents, TOTAL_MICRO, incomeCents) : 0;
  if (micro < 1 || micro > TOTAL_MICRO) return { ok: false, error: OUT_OF_RANGE };
  return { ok: true, value: micro };
}

/** Percentage a row needs so the whole set sums to 100%: its current value plus whatever the sum lacks (or minus the excess). */
export function adjustToTotal(rowMicro: number, sumMicro: number): Result<number> {
  const micro = rowMicro + TOTAL_MICRO - sumMicro;
  if (micro < 1 || micro > TOTAL_MICRO) return { ok: false, error: ADJUST_OUT_OF_RANGE };
  return { ok: true, value: micro };
}

/** Formats micro-percent as a percentage, e.g. 12_500_000 → "12,5%". */
export function formatPercent(micro: number): string {
  return `${percent.format(micro / MICRO_PER_PERCENT)}%`;
}

/** Formats basis points (spending shares, not category percentages) with exactly one decimal, e.g. 6250 → "62,5%", 0 → "0,0%". */
export function formatShare(bp: number): string {
  return `${share.format(bp / 100)}%`;
}
