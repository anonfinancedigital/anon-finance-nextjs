"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ContentCard } from "@/components/content-card";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/domain/money";
import type { SpendingPace } from "@/lib/domain/spending-pace";

const compactBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

/**
 * Accumulated spending per day of the month against the pace that spends the total target evenly.
 * Investments are left out until the viewer turns them on; the choice lasts only while the page stays on the month.
 */
export function SpendingPaceChart({ paces }: { paces: { consumption: SpendingPace; total: SpendingPace } }) {
  const [includeInvestments, setIncludeInvestments] = useState(false);
  const pace = includeInvestments ? paces.total : paces.consumption;
  const data = pace.points.map((p) => ({
    day: p.day,
    gasto: p.spentCents === null ? null : p.spentCents / 100,
    ideal: p.idealCents === null ? null : p.idealCents / 100,
  }));

  return (
    <ContentCard
      title="Ritmo de gastos"
      action={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={includeInvestments}
            onCheckedChange={setIncludeInvestments}
            aria-label="Incluir investimentos"
            className="h-5 w-9"
          />
          Incluir investimentos
        </label>
      }
      note={pace.aboveIdeal ? <span className="font-semibold text-destructive">Acima do ritmo ideal</span> : undefined}
    >
      {pace.hasSpending ? (
        <figure data-testid="pace-chart" className="space-y-2 px-6 pb-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--viz-spent)" }} />
              Gasto acumulado
            </li>
            {pace.hasReference && (
              <li className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-0 w-4 border-t-2 border-dashed"
                  style={{ borderColor: "var(--viz-target)" }}
                />
                Ritmo ideal
              </li>
            )}
          </ul>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis
                  tick={tick}
                  tickCount={4}
                  width={64}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => compactBRL.format(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(day) => `Dia ${day}`}
                  formatter={(value, name) => [
                    formatBRL(Math.round(Number(value) * 100)),
                    name === "ideal" ? "Ritmo ideal" : "Gasto acumulado",
                  ]}
                />
                {pace.hasReference && (
                  <Line
                    dataKey="ideal"
                    name="ideal"
                    stroke="var(--viz-target)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  dataKey="gasto"
                  name="gasto"
                  stroke="var(--viz-spent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ) : (
        <p className="px-6 pb-6 text-sm text-muted-foreground">Sem gastos no mês</p>
      )}
    </ContentCard>
  );
}
