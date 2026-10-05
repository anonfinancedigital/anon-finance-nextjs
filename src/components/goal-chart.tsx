"use client";

import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GoalSummary } from "@/lib/domain/freedom";
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

const INVESTED = "var(--viz-target)";
const INTEREST = "var(--viz-spent)";

const MAX_TICKS = 8;

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/** Whole ages from the first to the last point, thinned to at most `MAX_TICKS` labels. */
function ageTicks(first: number, last: number): number[] {
  const from = Math.ceil(first);
  const to = Math.floor(last);
  const step = Math.max(1, Math.ceil((to - from) / MAX_TICKS));
  const ticks: number[] = [];
  for (let age = from; age <= to; age += step) ticks.push(age);
  return ticks;
}

type Row = { age: number; ageYears: number; invested: number; interest: number; total: number };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div style={tooltipStyle} className="space-y-1">
      <p className="font-medium">Aos {row.ageYears} anos</p>
      <p className="flex items-center gap-1.5">
        <Swatch color={INVESTED} /> Total investido: {formatBRL(row.invested)}
      </p>
      <p className="flex items-center gap-1.5">
        <Swatch color={INTEREST} /> Rendimentos: {formatBRL(row.interest)}
      </p>
      <p className="font-medium">Total: {formatBRL(row.total)}</p>
    </div>
  );
}

/**
 * Stacked area of the patrimony up to retirement: what came out of the pocket versus compound
 * interest, with the 25/50/75% checkpoints marked. Renders nothing when the term is over.
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
  const share = summary.interestSharePct;
  const summaryText = `Rendimentos: ${share}% do patrimônio aos ${last.ageYears} anos`;
  // Checkpoints still ahead (25/50/75%) become dots on the curve, at the age the projection reaches them.
  const marks = summary.checkpoints.filter((c) => c.fractionBp < 10_000 && c.months !== null);

  return (
    <figure
      data-testid="goal-chart"
      aria-label={`Evolução do patrimônio: alvo ${formatBRL(summary.targetCents)} aos ${last.ageYears} anos. ${summaryText}`}
      className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-lg"
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Evolução do patrimônio</span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Swatch color={INVESTED} /> Total investido
          </li>
          <li className="flex items-center gap-1.5">
            <Swatch color={INTEREST} /> Rendimentos
          </li>
        </ul>
      </figcaption>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
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
            />
            <YAxis
              tick={tick}
              width={64}
              tickCount={4}
              tickFormatter={(v: number) => formatCompactBRL(v)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="invested"
              name="Total investido"
              stackId="patrimony"
              stroke={INVESTED}
              strokeWidth={2}
              fill={INVESTED}
              fillOpacity={0.3}
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
              isAnimationActive={false}
            />
            {marks.map((c) => (
              <ReferenceDot
                key={c.fractionBp}
                x={last.age - (summary.months - c.months!) / 12}
                y={c.valueCents}
                r={5}
                fill="var(--card)"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: `${c.fractionBp / 100}%`, position: "top", fill: "var(--foreground)", fontSize: 12 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm">
        <span className="font-medium">{summaryText}</span>
        <span className="text-muted-foreground"> · marcas nos 25%, 50% e 75% do alvo</span>
      </p>

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
