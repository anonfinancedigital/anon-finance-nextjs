/** Category color = index 1..8 of the theme's categorical palette (`--viz-1` … `--viz-8`). */
export const CATEGORY_COLORS = [
  { value: 1, name: "Azul" },
  { value: 2, name: "Laranja" },
  { value: 3, name: "Verde" },
  { value: 4, name: "Amarelo" },
  { value: 5, name: "Rosa" },
  { value: 6, name: "Verde-escuro" },
  { value: 7, name: "Roxo" },
  { value: 8, name: "Vermelho" },
] as const;

/** CSS color of a palette index; the token switches between light and dark theme variants. */
export function colorVar(color: number): string {
  return `var(--viz-${color})`;
}

export function isCategoryColor(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= CATEGORY_COLORS.length;
}

/** First palette color not in `used`; color 1 when all are taken. */
export function nextFreeColor(used: number[]): number {
  return CATEGORY_COLORS.find((c) => !used.includes(c.value))?.value ?? 1;
}
