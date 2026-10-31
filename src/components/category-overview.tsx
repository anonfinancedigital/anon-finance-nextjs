"use client";

import { useMemo, useState } from "react";
import { SpentVsTarget } from "@/components/budget-charts";
import { ContentCard } from "@/components/content-card";
import { SummaryTable } from "@/components/summary-table";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategorySummary } from "@/lib/domain/budget";
import { DEFAULT_SUMMARY_SORT, nextSummarySort, sortSummaryRows, type SummarySort } from "@/lib/domain/summary-sort";

type View = "tabela" | "barras";

const views: { value: View; label: string }[] = [
  { value: "tabela", label: "Tabela" },
  { value: "barras", label: "Barras" },
];

/** Sort choices of the phone layout, which has no column headers to click. */
const SORT_CHOICES: { value: string; label: string; sort: NonNullable<SummarySort> }[] = [
  { value: "consumption", label: "Maior consumo", sort: { key: "consumption", direction: "desc" } },
  { value: "spent", label: "Maior gasto", sort: { key: "spent", direction: "desc" } },
  { value: "remaining", label: "Menor restante", sort: { key: "remaining", direction: "asc" } },
  { value: "target", label: "Maior meta", sort: { key: "target", direction: "desc" } },
  { value: "name", label: "Nome (A–Z)", sort: { key: "name", direction: "asc" } },
];

/**
 * "Gastos por categoria": the same data as a table or as spent × target bars, one at a time. The order chosen
 * in the table headers (screen only, consumption first by default) applies to both views.
 */
export function CategoryOverview({ rows, hideCta = false }: { rows: CategorySummary[]; hideCta?: boolean }) {
  const [view, setView] = useState<View>("tabela");
  const [sort, setSort] = useState<SummarySort>(DEFAULT_SUMMARY_SORT);
  const sorted = useMemo(() => sortSummaryRows(rows, sort), [rows, sort]);

  if (rows.length === 0) {
    return (
      <ContentCard
        title="Gastos por categoria"
        description="Veja para onde vai seu dinheiro, comparado com o que você planejou."
      >
        <SummaryTable rows={rows} hideCta={hideCta} />
      </ContentCard>
    );
  }

  return (
    <Tabs value={view} onValueChange={(next) => setView(next as View)} className="gap-0">
      <ContentCard
        title="Gastos por categoria"
        note={<span className="hidden sm:inline">{rows.length} categorias</span>}
        action={
          <TabsList aria-label="Visão das categorias">
            {views.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-3 data-[state=active]:bg-primary/15 data-[state=active]:text-link"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        <div className="flex items-center gap-3 px-6 pb-3 sm:hidden">
          <Label htmlFor="summary-sort" className="shrink-0 text-xs text-muted-foreground">
            Ordenar por
          </Label>
          <SelectField
            id="summary-sort"
            value={
              SORT_CHOICES.find((c) => c.sort.key === sort?.key && c.sort.direction === sort.direction)?.value ?? ""
            }
            placeholder="Ordem personalizada"
            onValueChange={(value) => setSort(SORT_CHOICES.find((c) => c.value === value)?.sort ?? sort)}
            options={SORT_CHOICES.map(({ value, label }) => ({ value, label }))}
          />
        </div>
        <TabsContent value="tabela">
          <SummaryTable rows={sorted} sort={sort} onSort={(key) => setSort((current) => nextSummarySort(current, key))} />
        </TabsContent>
        <TabsContent value="barras">
          <SpentVsTarget rows={sorted} />
        </TabsContent>
      </ContentCard>
    </Tabs>
  );
}
