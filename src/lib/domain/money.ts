import type { Result } from "./result";

export const MAX_CENTS = 99_999_999_999;

// Integer part either plain digits or correctly grouped thousands; up to 2 decimals after a comma.
const BRL_PATTERN = /^(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Parses a pt-BR amount ("1.234,56", "1234,5", "1234") into integer cents.
 * Zero is rejected unless `allowZero` is set.
 */
export function parseBRL(input: string, { allowZero = false }: { allowZero?: boolean } = {}): Result<number> {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Informe o valor" };

  const match = BRL_PATTERN.exec(text);
  if (!match) {
    if (/^-\s*[\d.,]+$/.test(text)) {
      return { ok: false, error: allowZero ? "O valor não pode ser negativo" : "O valor deve ser maior que zero" };
    }
    return { ok: false, error: "Valor inválido. Use o formato 1.234,56" };
  }

  const integer = BigInt(match[1].replaceAll(".", ""));
  const decimals = BigInt((match[2] ?? "").padEnd(2, "0"));
  const cents = integer * BigInt(100) + decimals;

  if (cents === BigInt(0) && allowZero) return { ok: true, value: 0 };
  if (cents <= BigInt(0)) return { ok: false, error: "O valor deve ser maior que zero" };
  if (cents > BigInt(MAX_CENTS)) return { ok: false, error: "O valor máximo é R$ 999.999.999,99" };
  return { ok: true, value: Number(cents) };
}

/** Formats integer cents as BRL, e.g. 123456 → "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

const MAX_DIGITS = String(MAX_CENTS).length;

/**
 * Masks typed text as a pt-BR amount, filling cents from the right ("123456" → "1.234,56").
 * Non-digits are dropped, input is cut at 11 digits, and no digits or only zeros give "".
 */
export function maskBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS).replace(/^0+/, "");
  if (digits === "") return "";
  const padded = digits.padStart(3, "0");
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integer},${padded.slice(-2)}`;
}
