"use client";

import { PlusIcon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { CategoryCard } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SUBCATEGORIES, MAX_SUBCATEGORY_NAME } from "@/lib/domain/budget";
import { addSubcategoryLabel } from "@/lib/domain/category-label";
import { colorVar } from "@/lib/domain/color";

export type SubcategoryRow = { key: string; id?: string; name: string };

/**
 * Collapsible card with one category's subcategories. `index` is the category's position in the
 * set, used for the numbered labels and to find its errors ("<i>.subcategories[.<j>.name]");
 * `name` and `color` are the category's, as currently edited.
 */
export function SubcategoryEditor({
  index,
  name,
  color,
  items,
  errors,
  controls,
  trailing,
  onChange,
}: {
  index: number;
  name: string;
  color: number;
  items: SubcategoryRow[];
  errors: Record<string, string>;
  /** See `CategoryCard`: editable fields for the header line. */
  controls?: ReactNode;
  trailing?: ReactNode;
  onChange: (items: SubcategoryRow[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Key of the subcategory just added, whose name field takes focus when it mounts.
  const focusKey = useRef<string | null>(null);
  const listError = errors[`${index}.subcategories`];
  const hasNameError = items.some((_, j) => errors[`${index}.subcategories.${j}.name`]);
  // A rejected save must show what failed, even when the card is closed.
  const open = expanded || !!listError || hasNameError;
  const label = `categoria ${index + 1}`;

  function add() {
    const key = crypto.randomUUID();
    focusKey.current = key;
    onChange([...items, { key, name: "" }]);
  }

  return (
    <CategoryCard
      id={`subcategories-${index}`}
      name={name}
      color={color}
      count={items.length}
      open={open}
      onToggle={() => setExpanded(!open)}
      controls={controls}
      trailing={trailing}
    >
      <div className="mt-2 space-y-1 pl-12">
        {items.map((item, j) => {
          const nameError = errors[`${index}.subcategories.${j}.name`];
          return (
            <div key={item.key}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  style={{ backgroundColor: colorVar(color) }}
                  className="size-2 shrink-0 rounded-full"
                />
                <Input
                  ref={(el) => {
                    if (el && focusKey.current === item.key) {
                      focusKey.current = null;
                      el.focus();
                    }
                  }}
                  aria-label={`Nome da subcategoria ${j + 1} da ${label}`}
                  value={item.name}
                  maxLength={MAX_SUBCATEGORY_NAME + 20}
                  aria-invalid={!!nameError}
                  onChange={(e) =>
                    onChange(items.map((s, k) => (k === j ? { ...s, name: e.target.value } : s)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover subcategoria ${j + 1} da ${label}`}
                  onClick={() => onChange(items.filter((_, k) => k !== j))}
                >
                  Remover
                </Button>
              </div>
              {nameError && <p className="mt-1 pl-5 text-sm text-destructive">{nameError}</p>}
            </div>
          );
        })}
        {listError && <p className="text-sm text-destructive">{listError}</p>}
        <button
          type="button"
          disabled={items.length >= MAX_SUBCATEGORIES}
          onClick={add}
          className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addSubcategoryLabel(name)}
          <PlusIcon aria-hidden className="size-4" />
        </button>
      </div>
    </CategoryCard>
  );
}
