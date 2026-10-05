"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { Category } from "@/lib/domain/budget";
import { NO_SUBCATEGORY_PARAM, type TransactionFilter as Filter } from "@/lib/domain/transaction-filter";

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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative space-y-1">
        <Label htmlFor="filter-search">Buscar por descrição</Label>
        <SearchIcon aria-hidden className="pointer-events-none absolute bottom-3 left-3.5 size-4 text-muted-foreground" />
        <Input
          id="filter-search"
          type="search"
          className="pl-10"
          maxLength={120}
          value={text}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-category">Filtrar por categoria</Label>
        <SelectField
          id="filter-category"
          value={filter.categoryId ?? ""}
          onValueChange={(v) => apply({ categoria: v, subcategoria: "" })}
          options={[{ value: "", label: "Todas" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-subcategory">Filtrar por subcategoria</Label>
        <SelectField
          id="filter-subcategory"
          disabled={!category}
          value={filter.subcategoryId === "none" ? NO_SUBCATEGORY_PARAM : (filter.subcategoryId ?? "")}
          onValueChange={(v) => apply({ subcategoria: v })}
          options={[
            { value: "", label: "Todas" },
            { value: NO_SUBCATEGORY_PARAM, label: "Sem subcategoria" },
            ...(category?.subcategories ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </div>
    </div>
  );
}
