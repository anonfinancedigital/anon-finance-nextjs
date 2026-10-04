"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SUBCATEGORIES, MAX_SUBCATEGORY_NAME } from "@/lib/domain/budget";

export type SubcategoryRow = { key: string; id?: string; name: string };

/**
 * Collapsible list of one category's subcategories. `index` is the category's position in the
 * set, used for the numbered labels and to find its errors ("<i>.subcategories[.<j>.name]").
 */
export function SubcategoryEditor({
  index,
  items,
  errors,
  onChange,
}: {
  index: number;
  items: SubcategoryRow[];
  errors: Record<string, string>;
  onChange: (items: SubcategoryRow[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const listError = errors[`${index}.subcategories`];
  const hasNameError = items.some((_, j) => errors[`${index}.subcategories.${j}.name`]);
  // A rejected save must show what failed, even when the list is collapsed.
  const open = expanded || !!listError || hasNameError;
  const panelId = `subcategories-${index}`;
  const label = `categoria ${index + 1}`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setExpanded(!open)}
        className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {`Subcategorias (${items.length})`}
      </button>
      {open && (
        <div id={panelId} className="space-y-2 pl-4">
          {items.map((item, j) => {
            const nameError = errors[`${index}.subcategories.${j}.name`];
            return (
              <div key={item.key}>
                <div className="flex items-center gap-2">
                  <Input
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
                {nameError && <p className="mt-1 text-sm text-destructive">{nameError}</p>}
              </div>
            );
          })}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.length >= MAX_SUBCATEGORIES}
            aria-label={`Adicionar subcategoria à ${label}`}
            onClick={() => onChange([...items, { key: crypto.randomUUID(), name: "" }])}
          >
            Adicionar subcategoria
          </Button>
        </div>
      )}
    </div>
  );
}
