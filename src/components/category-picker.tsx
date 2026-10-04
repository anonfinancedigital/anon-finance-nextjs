"use client";

import { useId, useState } from "react";
import { CategoryCard, CategorySquare } from "@/components/category-card";
import { categoryDisplayName, pickSelection } from "@/lib/domain/category-label";

type Option = {
  id: string;
  name: string;
  color: number;
  subcategories: { id: string; name: string }[];
};

const optionClass = "flex cursor-pointer items-center gap-3 py-2 text-sm";

/**
 * Single choice of category and, optionally, subcategory. Categories with subcategories are
 * collapsible cards (the current one starts open); the others are a plain selectable row.
 */
export function CategoryPicker({
  categories,
  categoryId,
  subcategoryId,
  invalid,
  onChange,
}: {
  categories: Option[];
  categoryId: string;
  /** "" = Sem subcategoria. */
  subcategoryId: string;
  invalid?: boolean;
  onChange: (selection: { categoryId: string; subcategoryId: string }) => void;
}) {
  const uid = useId();
  const [openIds, setOpenIds] = useState<string[]>(() => (categoryId ? [categoryId] : []));

  function toggle(id: string) {
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Categoria"
      className={`divide-y rounded-lg border px-3 ${invalid ? "border-destructive" : "border-input"}`}
    >
      {categories.map((c) => {
        const selected = c.id === categoryId;
        if (c.subcategories.length === 0) {
          return (
            <label key={c.id} className={optionClass}>
              <CategorySquare name={c.name} color={c.color} />
              <span className="min-w-0 flex-1 truncate">{categoryDisplayName(c.name)}</span>
              <input
                type="radio"
                name={uid}
                value={c.id}
                checked={selected}
                onChange={() => onChange(pickSelection(c.id))}
              />
            </label>
          );
        }
        return (
          <div key={c.id} className="py-1">
            <CategoryCard
              id={`${uid}-${c.id}`}
              name={c.name}
              color={c.color}
              count={c.subcategories.length}
              open={openIds.includes(c.id)}
              onToggle={() => toggle(c.id)}
            >
              <div className="pl-12">
                <label className={optionClass}>
                  <span className="flex-1">Sem subcategoria</span>
                  <input
                    type="radio"
                    name={uid}
                    value={c.id}
                    checked={selected && subcategoryId === ""}
                    onChange={() => onChange(pickSelection(c.id))}
                  />
                </label>
                {c.subcategories.map((s) => (
                  <label key={s.id} className={optionClass}>
                    <span className="flex-1">{s.name}</span>
                    <input
                      type="radio"
                      name={uid}
                      value={`${c.id}:${s.id}`}
                      checked={selected && subcategoryId === s.id}
                      onChange={() => onChange(pickSelection(c.id, s.id))}
                    />
                  </label>
                ))}
              </div>
            </CategoryCard>
          </div>
        );
      })}
    </div>
  );
}
