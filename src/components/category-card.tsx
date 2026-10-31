import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { categoryDisplayName, categoryInitial, subcategoryCountLabel } from "@/lib/domain/category-label";
import { colorVar } from "@/lib/domain/color";

/** Rounded square in the category's color with its initial. */
export function CategorySquare({ name, color }: { name: string; color: number }) {
  return (
    <span
      aria-hidden
      style={{
        color: colorVar(color),
        backgroundColor: `color-mix(in srgb, ${colorVar(color)} 18%, transparent)`,
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-semibold"
    >
      {categoryInitial(name)}
    </span>
  );
}

/**
 * Collapsible category header (colored square, name, subcategory count, chevron) with a panel.
 * Controlled: the parent owns `open`, so it can force the panel open (e.g. to show an error).
 */
export function CategoryCard({
  id,
  name,
  color,
  count,
  open,
  onToggle,
  controls,
  trailing,
  children,
}: {
  /** Id of the panel; the header button points at it with aria-controls. */
  id: string;
  name: string;
  color: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  /**
   * Editable fields shown in the header line, replacing the square and the name. Without them the
   * whole header is the toggle button; with them only the count and chevron are (an input cannot
   * live inside a button).
   */
  controls?: ReactNode;
  /** Shown after the toggle, only together with `controls`. */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  // Without subcategories the toggle reads as the action it leads to, instead of "0 subcategorias".
  const countAndChevron =
    count === 0 && !open ? (
      <span className="flex shrink-0 items-center gap-1 text-xs text-link">
        <PlusIcon aria-hidden className="size-4" />
        Adicionar
      </span>
    ) : (
      <>
        <span className="shrink-0 text-xs text-muted-foreground">{subcategoryCountLabel(count)}</span>
        <Chevron aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </>
    );

  return (
    <div>
      {controls ? (
        // Below sm the controls stack in a two-column grid (see `CategoryEditor`); from sm up, one wrapping row.
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-1 sm:flex sm:flex-wrap sm:items-start">
          {controls}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            aria-label={`${subcategoryCountLabel(count)} de ${categoryDisplayName(name)}`}
            onClick={onToggle}
            className="flex h-8 w-full shrink-0 cursor-pointer items-center justify-end gap-2 rounded-lg sm:mt-1 sm:w-32 sm:justify-between"
          >
            {countAndChevron}
          </button>
          {trailing}
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg py-1 text-left"
        >
          <CategorySquare name={name} color={color} />
          <span className="min-w-0 flex-1 truncate">{categoryDisplayName(name)}</span>
          {countAndChevron}
        </button>
      )}
      <div id={id}>{open && children}</div>
    </div>
  );
}
