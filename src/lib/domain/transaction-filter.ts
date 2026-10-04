import type { Category } from "./budget";

/** `subcategoryId`: a subcategory id, "none" for expenses without one, or null for any. */
export type TransactionFilter = { categoryId: string | null; subcategoryId: string | "none" | null };

/** URL value of "Sem subcategoria". */
export const NO_SUBCATEGORY_PARAM = "nenhuma";

/**
 * Reads `?categoria=` and `?subcategoria=`. Unknown ids resolve to "Todas" (null), and a
 * subcategory that is not one of the chosen category's is ignored.
 */
export function parseTransactionFilter(
  params: { categoria?: string; subcategoria?: string },
  categories: Category[],
): TransactionFilter {
  const category = categories.find((c) => c.id === params.categoria);
  if (!category) return { categoryId: null, subcategoryId: null };

  if (params.subcategoria === NO_SUBCATEGORY_PARAM) {
    return { categoryId: category.id, subcategoryId: "none" };
  }
  const subcategory = category.subcategories.find((s) => s.id === params.subcategoria);
  return { categoryId: category.id, subcategoryId: subcategory?.id ?? null };
}

/** Applies the filter to the month's list; any category filter hides incomes. */
export function filterTransactions<
  T extends { categoryId: string | null; subcategoryId: string | null },
>(txs: T[], filter: TransactionFilter): T[] {
  if (filter.categoryId === null) return txs;
  return txs.filter((tx) => {
    if (tx.categoryId !== filter.categoryId) return false;
    if (filter.subcategoryId === null) return true;
    return filter.subcategoryId === "none"
      ? tx.subcategoryId === null
      : tx.subcategoryId === filter.subcategoryId;
  });
}

const MAX_SEARCH_LENGTH = 120;

/** Lowercase without accents, so "cafe" finds "Café". */
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Reads `?busca=`: trimmed and cut to 120 characters; blank means no search. */
export function parseSearch(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_SEARCH_LENGTH).trim();
}

/** Keeps transactions whose description contains the text; no text keeps all. Undescribed ones never match. */
export function searchTransactions<T extends { description: string | null }>(
  txs: T[],
  search: string,
): T[] {
  if (search === "") return txs;
  const needle = fold(search);
  return txs.filter((tx) => tx.description !== null && fold(tx.description).includes(needle));
}
