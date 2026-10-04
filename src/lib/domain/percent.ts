import type { Result } from "./result";

const PERCENT_PATTERN = /^(\d+)(?:,(\d{1,2}))?$/;

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const share = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Parses a pt-BR percentage ("12,5") into integer basis points (1% = 100). */
export function parsePercent(input: string): Result<number> {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Informe o percentual" };

  const match = PERCENT_PATTERN.exec(text);
  if (!match) {
    return { ok: false, error: "Percentual inválido. Use um número com até 2 casas decimais" };
  }

  const bp = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (bp < 1 || bp > 10000) {
    return { ok: false, error: "O percentual deve estar entre 0,01 e 100" };
  }
  return { ok: true, value: bp };
}

/** Converts an amount into the basis points it represents of an income; 0 and above-income amounts are out of range. */
export function bpFromCents(cents: number, incomeCents: number): Result<number> {
  const bp = incomeCents > 0 ? Math.round((cents * 10000) / incomeCents) : 0;
  if (bp < 1 || bp > 10000) return { ok: false, error: "O percentual deve estar entre 0,01 e 100" };
  return { ok: true, value: bp };
}

/** Formats basis points as a percentage, e.g. 1250 → "12,5%". */
export function formatPercent(bp: number): string {
  return `${percent.format(bp / 100)}%`;
}

/** Formats basis points with exactly one decimal, e.g. 6250 → "62,5%", 0 → "0,0%". */
export function formatShare(bp: number): string {
  return `${share.format(bp / 100)}%`;
}
