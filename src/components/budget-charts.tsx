"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ContentCard } from "@/components/content-card";
import type { CategorySummary } from "@/lib/domain/budget";
import { colorVar } from "@/lib/domain/color";
import { formatBRL } from "@/lib/domain/money";

export type Row = Pick<CategorySummary, "id" | "name" | "color" | "targetCents" | "spentCents" | "overspent" | "overspentCents">;

const compactBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const share = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/** Bars: spent × target per category (overspent bar in a distinct color plus a text label). */
export function SpentVsTarget({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({
    name: r.name,
    meta: r.targetCents / 100,
    gasto: r.spentCents / 100,
    overspent: r.overspent,
    label: r.overspent ? `Estourou ${formatBRL(r.overspentCents)}` : "",
  }));

  return (
    <figure data-testid="bar-chart" className="space-y-2 px-6 pb-6">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--viz-target)" /> Meta
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--viz-spent)" /> Gasto
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--viz-over)" /> Gasto acima da meta (Estourou)
        </li>
      </ul>
      <div style={{ height: data.length * 48 + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barGap={2} margin={{ top: 4, right: 128, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
            <XAxis
              type="number"
              tickCount={3}
              tick={tick}
              tickFormatter={(v: number) => compactBRL.format(v)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis type="category" dataKey="name" tick={tick} width={110} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              contentStyle={tooltipStyle}
              formatter={(value, name) => [formatBRL(Math.round(Number(value) * 100)), name === "meta" ? "Meta" : "Gasto"]}
            />
            <Bar dataKey="meta" name="meta" fill="var(--viz-target)" barSize={12} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="gasto" name="gasto" barSize={12} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.overspent ? "var(--viz-over)" : "var(--viz-spent)"} />
              ))}
              <LabelList dataKey="label" position="right" fill="var(--foreground)" fontSize={12} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Donut: each category's share of the month's spending, one slice per category in its own color. */
function SpendingShare({ rows, spentCents }: { rows: Row[]; spentCents: number }) {
  const data = rows
    .map((r) => ({ name: r.name, cents: r.spentCents, color: colorVar(r.color) }))
    .filter((s) => s.cents > 0);

  return (
    <figure data-testid="pie-chart" className="px-6 pb-6">
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative size-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="cents"
                nameKey="name"
                innerRadius="55%"
                outerRadius="100%"
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${formatBRL(Number(value))} (${share.format(Number(value) / spentCents)})`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground">Total gasto</span>
            <span className="font-display text-sm font-bold">{formatBRL(spentCents)}</span>
          </div>
        </div>
        <ul className="min-w-44 flex-1 space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <Swatch color={d.color} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="ml-auto font-semibold tabular-nums">{share.format(d.cents / spentCents)}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

/** Charts of the monthly summary; the summary table is their table view. */
export function BudgetCharts({ rows, spentCents }: { rows: Row[]; spentCents: number }) {
  if (rows.length === 0) return null;

  return (
    <div data-testid="budget-charts" className="grid gap-6 lg:grid-cols-2">
      <ContentCard title="Gasto × meta por categoria">
        <SpentVsTarget rows={rows} />
      </ContentCard>
      <ContentCard title="Participação no gasto do mês">
        {spentCents > 0 ? (
          <SpendingShare rows={rows} spentCents={spentCents} />
        ) : (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Sem gastos no mês</p>
        )}
      </ContentCard>
    </div>
  );
}
