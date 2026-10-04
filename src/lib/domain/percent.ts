import type { Result } from "./result";

const PERCENT_PATTERN = /^(\d+)(?:,(\d{1,2}))?$/;

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

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

/** Formats basis points as a percentage, e.g. 1250 → "12,5%". */
export function formatPercent(bp: number): string {
  return `${percent.format(bp / 100)}%`;
}
