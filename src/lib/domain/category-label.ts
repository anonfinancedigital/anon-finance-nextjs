const FALLBACK_NAME = "Nova categoria";

export function subcategoryCountLabel(count: number): string {
  return count === 1 ? "1 subcategoria" : `${count} subcategorias`;
}

/** Trimmed name, or a placeholder while a new category has no name yet. */
export function categoryDisplayName(name: string): string {
  return name.trim() || FALLBACK_NAME;
}

export function categoryInitial(name: string): string {
  return categoryDisplayName(name).charAt(0).toUpperCase();
}

export function addSubcategoryLabel(categoryName: string): string {
  return `Nova subcategoria em ${categoryDisplayName(categoryName)}`;
}

/** "" = Sem subcategoria. */
export function pickSelection(
  categoryId: string,
  subcategoryId = "",
): { categoryId: string; subcategoryId: string } {
  return { categoryId, subcategoryId };
}
