import type { GoalSummary } from "@/lib/domain/freedom";
import { formatBRL } from "@/lib/domain/money";
import { formatShare } from "@/lib/domain/percent";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 ano e 2 meses", "3 anos", "5 meses"; "0 meses" when there is no time left. */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, "mês", "meses");
  if (rest === 0) return plural(years, "ano", "anos");
  return `${plural(years, "ano", "anos")} e ${plural(rest, "mês", "meses")}`;
}

// Soft violet glow from the top corner and an emerald one from the bottom, both from theme tokens.
const glow = {
  backgroundImage:
    "radial-gradient(36rem 16rem at 100% 0%, var(--glow-a), transparent 65%), radial-gradient(28rem 14rem at 0% 100%, color-mix(in oklab, var(--income) 12%, transparent), transparent 65%)",
};

/**
 * Top card of the goal: target, what is saved and the progress, the monthly deposit as the main
 * action, and the passive income the target pays.
 */
export function GoalHero({ summary }: { summary: GoalSummary }) {
  const rate = String(summary.annualRateBp / 100);

  return (
    <section
      aria-label="Resumo do objetivo"
      style={glow}
      className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Meta Patrimonial</p>
        <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {formatBRL(summary.targetCents)}
        </p>
        <p className="inline-flex flex-wrap items-center gap-x-2 rounded-full bg-income/15 px-3 py-1 text-sm font-medium text-income">
          <span>Gera {formatBRL(summary.monthlyIncomeCents)}/mês sem consumir o principal</span>
          <span className="font-normal">a {rate}% ao ano</span>
        </p>
      </div>

      <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div>
          <dt className="text-sm text-muted-foreground">Patrimônio Acumulado</dt>
          <dd className="font-display text-2xl font-bold">{formatBRL(summary.savedCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Progresso</dt>
          <dd className="font-display text-2xl font-bold text-income">{formatShare(summary.progressBp)}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
        <p className="text-sm font-medium text-link">Aporte Estratégico Mensal</p>
        <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {summary.monthlyCents === null ? "Prazo encerrado" : formatBRL(summary.monthlyCents)}
        </p>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Distância do Alvo</dt>
          <dd className="font-medium">{formatBRL(summary.remainingCents)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Tempo até o Ápice</dt>
          <dd className="font-medium">{formatTerm(summary.months)}</dd>
        </div>
      </dl>
    </section>
  );
}
