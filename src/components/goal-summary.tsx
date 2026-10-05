import { Progress } from "@/components/ui/progress";
import type { GoalSummary as Summary } from "@/lib/domain/freedom";
import { formatBRL } from "@/lib/domain/money";
import { formatShare } from "@/lib/domain/percent";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 ano e 2 meses", "3 anos", "5 meses"; "0 meses" when there is no time left. */
function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, "mês", "meses");
  if (rest === 0) return plural(years, "ano", "anos");
  return `${plural(years, "ano", "anos")} e ${plural(rest, "mês", "meses")}`;
}

/** Saved amount, target, what is missing, progress bar, required monthly deposit and remaining term. */
export function GoalSummary({ summary }: { summary: Summary }) {
  const share = formatShare(summary.progressBp);
  // The bar is capped at 100; the text keeps the real percentage (e.g. "120,0%").
  const barValue = Math.min(100, summary.progressBp / 100);

  return (
    <section aria-label="Resumo do objetivo" className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Guardado</dt>
          <dd className="text-lg font-semibold">{formatBRL(summary.savedCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Patrimônio-alvo</dt>
          <dd className="text-lg font-semibold">{formatBRL(summary.targetCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Falta</dt>
          <dd className="text-lg font-semibold">{formatBRL(summary.remainingCents)}</dd>
        </div>
      </dl>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{share}</span>
        </div>
        <div className="relative">
          <Progress className="h-3" value={barValue} aria-label={`Progresso do objetivo: ${share}`} />
          {summary.milestones.map((m) => (
            <span
              key={m.months}
              aria-hidden
              className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-foreground/60"
              style={{ left: `${m.positionBp / 100}%` }}
            />
          ))}
        </div>
      </div>

      {summary.milestones.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Projeção</h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.milestones.map((m) => (
              <li key={m.months} className="rounded-md border px-3 py-2 text-sm">
                <span className="block text-muted-foreground">
                  {formatTerm(m.months)} · aos {m.ageYears} anos
                </span>
                <span className="font-semibold">{formatBRL(m.valueCents)}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Projeção com 8% ao ano fixos e o aporte mensal necessário investido todos os meses.
          </p>
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Aporte mensal necessário</dt>
          <dd className="text-lg font-semibold">
            {summary.monthlyCents === null ? "Prazo encerrado" : formatBRL(summary.monthlyCents)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Prazo restante</dt>
          <dd className="text-lg font-semibold">{formatTerm(summary.months)}</dd>
        </div>
      </dl>
    </section>
  );
}
