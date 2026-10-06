import { Info } from "lucide-react";
import { GoalCheckpoints } from "@/components/goal-checkpoints";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GoalSummary } from "@/lib/domain/freedom";
import { HOW_DISCLAIMER, HOW_TITLE, heroPill, howWeCalculate } from "@/lib/domain/freedom-copy";
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
 * Top card of the goal. Two columns when the card is wide enough: the destination (target, what is
 * saved) on the left and the plan (monthly deposit, time and distance left) on the right; the
 * progress bar with the checkpoints closes the card.
 */
export function GoalHero({ summary }: { summary: GoalSummary }) {
  return (
    <section
      aria-label="Resumo do objetivo"
      style={glow}
      className="@container overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      <div className="grid @xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">Meta Patrimonial</p>
          <p className="font-display text-3xl font-bold tracking-tight @xl:text-2xl @3xl:text-3xl">
            {formatBRL(summary.targetCents)}
          </p>
          <p className="w-fit rounded-full bg-income/15 px-3 py-1 text-sm text-income">{heroPill(summary)}</p>
          <p className="text-sm text-muted-foreground">
            {formatBRL(summary.savedCents)} acumulados ({formatShare(summary.progressBp)} do alvo)
          </p>
          <Popover>
            <PopoverTrigger className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30">
              <Info aria-hidden className="size-4" />
              Como calculamos?
            </PopoverTrigger>
            <PopoverContent className="space-y-2">
              <p className="font-medium">{HOW_TITLE}</p>
              <p>{howWeCalculate(summary)}</p>
              <p className="text-xs text-muted-foreground">{HOW_DISCLAIMER}</p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 bg-primary/10 p-5">
          <p className="text-sm font-medium text-link">Aporte Estratégico Mensal</p>
          <p className="font-display text-4xl font-bold tracking-tight @xl:text-3xl @3xl:text-4xl">
            {summary.monthlyCents === null ? (
              "Prazo encerrado"
            ) : (
              <>
                {formatBRL(summary.monthlyCents)}
                <span className="text-base font-medium text-muted-foreground"> / mês</span>
              </>
            )}
          </p>
          <dl className="space-y-0.5 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Tempo até o Ápice:</dt>
              <dd className="font-medium">{formatTerm(summary.months)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Distância do Alvo:</dt>
              <dd className="font-medium">{formatBRL(summary.remainingCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <GoalCheckpoints summary={summary} />
      </div>
    </section>
  );
}
