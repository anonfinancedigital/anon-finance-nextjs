import { formatPercent } from "./percent";

export const TOTAL_BP = 10000;
export const MAX_CATEGORY_NAME = 40;
export const MAX_SUBCATEGORY_NAME = 40;
export const MAX_SUBCATEGORIES = 30;

export type CategoryInput = { name: string; bp: number; subcategories?: { name: string }[] };

/**
 * Failure carries field errors keyed by "<index>.name", "<index>.subcategories.<j>.name" and
 * "<index>.subcategories" so callers can show them next to the item.
 */
export type CategorySetResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Rules of the whole set: percentages sum to exactly 100% and names are 1..40 chars, unique ignoring
 * case. Subcategories (at most 30 per category) follow the same name rule within their category and
 * do not take part in the sum.
 */
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

    const subs = cat.subcategories ?? [];
    if (subs.length > MAX_SUBCATEGORIES)
      fieldErrors[`${i}.subcategories`] = `Máximo de ${MAX_SUBCATEGORIES} subcategorias por categoria`;
    const seenSubs = new Set<string>();
    subs.forEach((sub, j) => {
      const subName = sub.name.trim();
      const subKey = subName.toLocaleLowerCase("pt-BR");
      const path = `${i}.subcategories.${j}.name`;
      if (subName === "") fieldErrors[path] = "Informe o nome da subcategoria";
      else if (subName.length > MAX_SUBCATEGORY_NAME)
        fieldErrors[path] = `O nome deve ter no máximo ${MAX_SUBCATEGORY_NAME} caracteres`;
      else if (seenSubs.has(subKey))
        fieldErrors[path] = "Já existe uma subcategoria com esse nome nesta categoria";
      seenSubs.add(subKey);
    });
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

/** Share of an income given to a category: round(income × bp / 10000). */
export function allocateCents(incomeCents: number, percentBp: number): number {
  return Math.round((incomeCents * percentBp) / TOTAL_BP);
}

export type Subcategory = { id: string; name: string };

/** `color` is the palette index 1..8 (see `./color`). `subcategories` are in creation order. */
export type Category = {
  id: string;
  name: string;
  percentBp: number;
  color: number;
  subcategories: Subcategory[];
};

export type SubcategorySpend = {
  /** `null` is the "Sem subcategoria" line. */
  subcategoryId: string | null;
  name: string;
  spentCents: number;
  /** Share of the category's spending, in basis points: round(spent × 10000 / category spent). */
  shareBp: number;
};

export const NO_SUBCATEGORY_NAME = "Sem subcategoria";

/** round(part × 10000 / total) in basis points; 0 when total is 0. */
export function shareBp(partCents: number, totalCents: number): number {
  return totalCents > 0 ? Math.round((partCents * TOTAL_BP) / totalCents) : 0;
}

export type CategorySummary = Category & {
  targetCents: number;
  spentCents: number;
  remainingCents: number;
  overspent: boolean;
  overspentCents: number;
  /** Share of the target already spent, in whole percent (may exceed 100). */
  consumedPct: number;
  /**
   * Spending by subcategory, only lines with spending, highest first (ties: creation order,
   * "Sem subcategoria" last). Sums to `spentCents`. Empty without `spentBySubcategory`.
   */
  breakdown: SubcategorySpend[];
};

export type MonthlySummary = {
  rows: CategorySummary[];
  incomeCents: number;
  spentCents: number;
  balanceCents: number;
};

function buildBreakdown(
  cat: Category,
  categorySpentCents: number,
  spent: Map<string | null, number> | undefined,
): SubcategorySpend[] {
  if (!spent) return [];
  const line = (subcategoryId: string | null, name: string): SubcategorySpend[] => {
    const spentCents = spent.get(subcategoryId) ?? 0;
    return spentCents > 0
      ? [{ subcategoryId, name, spentCents, shareBp: shareBp(spentCents, categorySpentCents) }]
      : [];
  };
  const lines = [
    ...cat.subcategories.flatMap((sub) => line(sub.id, sub.name)),
    ...line(null, NO_SUBCATEGORY_NAME),
  ];
  // Array.sort is stable: equal spending keeps creation order, "Sem subcategoria" last.
  return lines.sort((a, b) => b.spentCents - a.spentCents);
}

/** Target per category = round(income × bp / 10000); overspent when spent > target. */
export function buildMonthlySummary(input: {
  categories: Category[];
  incomeCents: number;
  spentByCategory: Map<string, number>;
  spentBySubcategory?: Map<string, Map<string | null, number>>;
}): MonthlySummary {
  const { categories, incomeCents, spentByCategory, spentBySubcategory } = input;

  const rows = categories.map((cat): CategorySummary => {
    const targetCents = allocateCents(incomeCents, cat.percentBp);
    const spentCents = spentByCategory.get(cat.id) ?? 0;
    const consumedPct =
      targetCents > 0 ? Math.round((spentCents * 100) / targetCents) : spentCents > 0 ? 100 : 0;
    return {
      ...cat,
      targetCents,
      spentCents,
      remainingCents: targetCents - spentCents,
      overspent: spentCents > targetCents,
      overspentCents: Math.max(0, spentCents - targetCents),
      consumedPct,
      breakdown: buildBreakdown(cat, spentCents, spentBySubcategory?.get(cat.id)),
    };
  });

  const spentCents = [...spentByCategory.values()].reduce((total, cents) => total + cents, 0);
  return { rows, incomeCents, spentCents, balanceCents: incomeCents - spentCents };
}
