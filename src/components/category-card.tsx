import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { categoryDisplayName, categoryInitial, subcategoryCountLabel } from "@/lib/domain/category-label";
import { colorVar } from "@/lib/domain/color";

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
  children,
}: {
  /** Id of the panel; the header button points at it with aria-controls. */
  id: string;
  name: string;
  color: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg py-1 text-left"
      >
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
        <span className="min-w-0 flex-1 truncate">{categoryDisplayName(name)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{subcategoryCountLabel(count)}</span>
        <Chevron aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <div id={id}>{open && children}</div>
    </div>
  );
}
