"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageTicks } from "@/lib/domain/age-ticks";
import { chartYAxis, compositionShares, type GoalSummary } from "@/lib/domain/freedom";
import { interestBadge } from "@/lib/domain/freedom-copy";
import { formatBRL, formatCompactBRL } from "@/lib/domain/money";

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  padding: "8px 12px",
};

const INVESTED = "var(--color-invested)";
const INTEREST = "var(--color-returns)";

/** "Meta: X" above the left end of the target line, on a card-colored plate so the line does not cross the text. */
function TargetLabel({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value: string }) {
  const x = (viewBox?.x ?? 0) + 8;
  const y = viewBox?.y ?? 0;
  const width = value.length * 7 + 12;
  return (
    <g>
      <rect x={x} y={y - 24} width={width} height={20} rx={4} fill="var(--card)" />
      <text x={x + 6} y={y - 10} fill="var(--muted-foreground)" fontSize={12}>
        {value}
      </text>
    </g>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

type Row = { age: number; ageYears: number; invested: number; interest: number; total: number };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  const shares = compositionShares(row.invested, row.total);
  return (
    <div style={tooltipStyle} className="space-y-1">
      <p className="font-medium">Aos {row.ageYears} anos</p>
      <p className="font-medium">Patrimônio total: {formatBRL(row.total)}</p>
      <p className="flex items-center gap-1.5">
        <Swatch color={INVESTED} /> Total investido: {formatBRL(row.invested)}
        {shares && ` (${shares.investedPct}%)`}
      </p>
      <p className="flex items-center gap-1.5">
        <Swatch color={INTEREST} /> Rendimentos: {formatBRL(row.interest)}
        {shares && ` (${shares.interestPct}%)`}
      </p>
    </div>
  );
}

/**
 * Stacked area of the patrimony up to retirement: what came out of the pocket versus compound
 * interest; the tooltip reads the patrimony year by year. Renders nothing when the term is over.
 */
export function GoalChart({ summary }: { summary: GoalSummary }) {
  const { timeline } = summary;
  if (timeline.length === 0) return null;

  const rows: Row[] = timeline.map((p) => ({
    age: p.age,
    ageYears: p.ageYears,
    invested: p.investedCents,
    interest: p.interestCents,
    total: p.totalCents,
  }));
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const badge = interestBadge(summary);
  const yAxis = chartYAxis(summary.targetCents, last.totalCents);

  return (
    <figure
      data-testid="goal-chart"
      aria-label={`Trajetória dos Juros Compostos: alvo ${formatBRL(summary.targetCents)} aos ${last.ageYears} anos.${badge ? ` ${badge}` : ""}`}
      className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-lg"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Trajetória dos Juros Compostos</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {badge && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-returns">
              <TrendingUp aria-hidden className="size-4 shrink-0" />
              {badge}
            </p>
          )}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Swatch color={INVESTED} /> Total investido
            </li>
            <li className="flex items-center gap-1.5">
              <Swatch color={INTEREST} /> Rendimentos
            </li>
          </ul>
        </div>
      </figcaption>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 28, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              type="number"
              dataKey="age"
              domain={[first.age, last.age]}
              ticks={ageTicks(first.age, last.age)}
              tick={tick}
              tickFormatter={(v: number) => `${v}`}
              axisLine={false}
              tickLine={false}
              height={40}
              label={{ value: "Idade", position: "insideBottom", offset: 0, fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              tick={tick}
              width={64}
              ticks={yAxis.ticks}
              domain={[0, yAxis.max]}
              tickFormatter={(v: number) => formatCompactBRL(v)}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={summary.targetCents}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              ifOverflow="extendDomain"
              label={<TargetLabel value={`Meta: ${formatCompactBRL(summary.targetCents)}`} />}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="invested"
              name="Total investido"
              stackId="patrimony"
              stroke={INVESTED}
              strokeWidth={2}
              fill={INVESTED}
              fillOpacity={0.3}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="interest"
              name="Rendimentos"
              stackId="patrimony"
              stroke={INTEREST}
              strokeWidth={2}
              fill={INTEREST}
              fillOpacity={0.3}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Evolução do patrimônio por idade</caption>
        <thead>
          <tr>
            <th scope="col">Idade</th>
            <th scope="col">Total investido</th>
            <th scope="col">Rendimentos</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.age}>
              <th scope="row">{r.ageYears} anos</th>
              <td>{formatBRL(r.invested)}</td>
              <td>{formatBRL(r.interest)}</td>
              <td>{formatBRL(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
