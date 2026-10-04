import { formatPercent } from "./percent";

export const TOTAL_BP = 10000;
export const MAX_CATEGORY_NAME = 40;

export type CategoryInput = { name: string; bp: number };

/** Failure carries field errors keyed by "<index>.name" so callers can show them next to the item. */
export type CategorySetResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Rules of the whole set: percentages sum to exactly 100% and names are 1..40 chars, unique ignoring case. */
export function validateCategorySet(cats: CategoryInput[]): CategorySetResult {
  const fieldErrors: Record<string, string> = {};
  const seen = new Set<string>();

  cats.forEach((cat, i) => {
    const name = cat.name.trim();
    const key = name.toLocaleLowerCase("pt-BR");
    if (name === "") fieldErrors[`${i}.name`] = "Informe o nome da categoria";
    else if (name.length > MAX_CATEGORY_NAME)
      fieldErrors[`${i}.name`] = `O nome deve ter no máximo ${MAX_CATEGORY_NAME} caracteres`;
    else if (seen.has(key)) fieldErrors[`${i}.name`] = "Já existe uma categoria com este nome";
    seen.add(key);
  });

  const sum = cats.reduce((total, cat) => total + cat.bp, 0);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  if (sum !== TOTAL_BP) {
    return {
      ok: false,
      error: `A soma dos percentuais deve ser 100% (atual: ${formatPercent(sum)})`,
      ...(hasFieldErrors && { fieldErrors }),
    };
  }
  if (hasFieldErrors) return { ok: false, error: "Corrija os nomes das categorias", fieldErrors };
  return { ok: true };
}
