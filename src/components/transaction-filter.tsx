"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/domain/budget";
import { NO_SUBCATEGORY_PARAM, type TransactionFilter as Filter } from "@/lib/domain/transaction-filter";

// Native selects, same choice as the transaction form (see SPEC_DEVIATION there).
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30";

/** Category and subcategory filters of the month list, kept in `?categoria=` and `?subcategoria=`. */
export function TransactionFilter({ categories, filter }: { categories: Category[]; filter: Filter }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = categories.find((c) => c.id === filter.categoryId);

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    router.replace(`/?${next.toString()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="filter-category">Filtrar por categoria</Label>
        <select
          id="filter-category"
          className={selectClass}
          value={filter.categoryId ?? ""}
          onChange={(e) => apply({ categoria: e.target.value, subcategoria: "" })}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-subcategory">Filtrar por subcategoria</Label>
        <select
          id="filter-subcategory"
          className={selectClass}
          disabled={!category}
          value={filter.subcategoryId === "none" ? NO_SUBCATEGORY_PARAM : (filter.subcategoryId ?? "")}
          onChange={(e) => apply({ subcategoria: e.target.value })}
        >
          <option value="">Todas</option>
          <option value={NO_SUBCATEGORY_PARAM}>Sem subcategoria</option>
          {category?.subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
