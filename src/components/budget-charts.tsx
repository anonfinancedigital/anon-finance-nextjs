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
import type { CategorySummary } from "@/lib/domain/budget";
import { formatBRL } from "@/lib/domain/money";

type Row = Pick<CategorySummary, "id" | "name" | "targetCents" | "spentCents" | "overspent" | "overspentCents">;

/** Categorical slots in fixed order; a category keeps its slot (its position in the set). */
const SLOTS = 8;
const slotColor = (i: number) => `var(--viz-${i + 1})`;

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
  borderRadius: 8,
  fontSize: 12,
};

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: color }} />;
}

/** Bars: spent × target per category (overspent bar in a distinct color plus a text label). */
function SpentVsTarget({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({
    name: r.name,
    meta: r.targetCents / 100,
    gasto: r.spentCents / 100,
    overspent: r.overspent,
    label: r.overspent ? `Estourou ${formatBRL(r.overspentCents)}` : "",
  }));

  return (
    <figure data-testid="bar-chart" className="space-y-2">
      <figcaption className="text-sm font-medium">Gasto × meta por categoria</figcaption>
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

/** Donut: each category's share of the month's spending. */
function SpendingShare({ rows, spentCents }: { rows: Row[]; spentCents: number }) {
  const slices = rows
    .map((r, i) => ({ name: r.name, cents: r.spentCents, color: i < SLOTS ? slotColor(i) : "var(--viz-other)", slot: i }))
    .filter((s) => s.cents > 0);
  // Past the 8 categorical slots, fold the tail into "Outras" instead of inventing hues.
  const head = slices.filter((s) => s.slot < SLOTS);
  const tail = slices.filter((s) => s.slot >= SLOTS);
  const data = tail.length
    ? [...head, { name: "Outras", cents: tail.reduce((t, s) => t + s.cents, 0), color: "var(--viz-other)", slot: SLOTS }]
    : head;

  return (
    <figure data-testid="pie-chart" className="space-y-2">
      <figcaption className="text-sm font-medium">Participação no gasto do mês</figcaption>
      <div className="flex flex-wrap items-center gap-4">
        <div className="size-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="cents"
                nameKey="name"
                innerRadius="55%"
                outerRadius="100%"
                stroke="var(--background)"
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
        </div>
        <ul className="space-y-1 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <Swatch color={d.color} />
              <span>{d.name}</span>
              <span className="tabular-nums text-muted-foreground">{share.format(d.cents / spentCents)}</span>
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
    <div data-testid="budget-charts" className="grid gap-8 lg:grid-cols-2">
      <SpentVsTarget rows={rows} />
      {spentCents > 0 ? (
        <SpendingShare rows={rows} spentCents={spentCents} />
      ) : (
        <p className="text-sm text-muted-foreground">Sem gastos no mês</p>
      )}
    </div>
  );
}
