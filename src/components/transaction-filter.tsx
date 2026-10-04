"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/domain/budget";
import { NO_SUBCATEGORY_PARAM, type TransactionFilter as Filter } from "@/lib/domain/transaction-filter";

// Native selects, same choice as the transaction form (see SPEC_DEVIATION there).
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30";

const SEARCH_DELAY_MS = 300;

/** Category and subcategory filters and the description search of the month list, kept in `?categoria=`, `?subcategoria=` and `?busca=`. */
export function TransactionFilter({
  categories,
  filter,
  search,
}: {
  categories: Category[];
  filter: Filter;
  search: string;
}) {
  const router = useRouter();
  const category = categories.find((c) => c.id === filter.categoryId);

  const [text, setText] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function onSearch(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ busca: value.trim() }), SEARCH_DELAY_MS);
  }

  function apply(changes: Record<string, string>) {
    // Read the live URL: the search may fire after other params changed.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    router.replace(`/?${next.toString()}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="filter-search">Buscar por descrição</Label>
        <Input
          id="filter-search"
          type="search"
          maxLength={120}
          value={text}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
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
