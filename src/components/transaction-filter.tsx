"use client";

import { ChevronDownIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { Category } from "@/lib/domain/budget";
import { NO_SUBCATEGORY_PARAM, type TransactionFilter as Filter } from "@/lib/domain/transaction-filter";

const SEARCH_DELAY_MS = 300;

/**
 * Category and subcategory filters and the description search of the month list, kept in `?categoria=`,
 * `?subcategoria=` and `?busca=`. Below md only the search is always shown: the two selects open from a
 * "Filtros" button that counts the ones in use.
 */
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
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const activeFilters = (filter.categoryId ? 1 : 0) + (filter.subcategoryId ? 1 : 0);
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
    // Same page, other filter: keep the scroll where it is.
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-end gap-2 md:contents">
        <div className="relative min-w-0 flex-1 space-y-1">
          <Label htmlFor="filter-search" className="sr-only md:not-sr-only">
            Buscar por descrição
          </Label>
          <SearchIcon aria-hidden className="pointer-events-none absolute bottom-3 left-3.5 size-4 text-muted-foreground" />
          <Input
            id="filter-search"
            type="search"
            placeholder="Buscar por descrição"
            className="pl-10"
            maxLength={120}
            value={text}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="h-10 shrink-0 md:hidden"
        >
          <SlidersHorizontalIcon aria-hidden />
          Filtros{activeFilters > 0 ? ` · ${activeFilters}` : ""}
          <ChevronDownIcon aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </div>
      <div id={panelId} className={`${open ? "grid" : "hidden"} grid-cols-1 gap-3 md:contents`}>
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
    </div>
  );
}
