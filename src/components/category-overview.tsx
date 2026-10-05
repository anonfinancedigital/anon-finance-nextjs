"use client";

import { useState } from "react";
import { SpentVsTarget } from "@/components/budget-charts";
import { ContentCard } from "@/components/content-card";
import { SummaryTable } from "@/components/summary-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategorySummary } from "@/lib/domain/budget";

type View = "tabela" | "barras";

const views: { value: View; label: string }[] = [
  { value: "tabela", label: "Tabela" },
  { value: "barras", label: "Barras" },
];

/** "Gastos por categoria": the same data as a table or as spent × target bars, one at a time. */
export function CategoryOverview({ rows }: { rows: CategorySummary[] }) {
  const [view, setView] = useState<View>("tabela");

  if (rows.length === 0) {
    return (
      <ContentCard title="Gastos por categoria" note="0 categorias">
        <SummaryTable rows={rows} />
      </ContentCard>
    );
  }

  return (
    <Tabs value={view} onValueChange={(next) => setView(next as View)} className="gap-0">
      <ContentCard
        title="Gastos por categoria"
        note={`${rows.length} categorias`}
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
        <TabsContent value="tabela">
          <SummaryTable rows={rows} />
        </TabsContent>
        <TabsContent value="barras">
          <SpentVsTarget rows={rows} />
        </TabsContent>
      </ContentCard>
    </Tabs>
  );
}
