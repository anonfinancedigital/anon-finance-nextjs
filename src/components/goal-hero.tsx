import { Info } from "lucide-react";
import { GoalCheckpoints } from "@/components/goal-checkpoints";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GoalSummary } from "@/lib/domain/freedom";
import { HOW_DISCLAIMER, HOW_TITLE, heroPill, howWeCalculate, PLAN_REACHED, planLines } from "@/lib/domain/freedom-copy";
import { formatBRL } from "@/lib/domain/money";
import { formatShare } from "@/lib/domain/percent";

// Soft violet glow from the top corner and an emerald one from the bottom, both from theme tokens.
const glow = {
  backgroundImage:
    "radial-gradient(36rem 16rem at 100% 0%, var(--glow-a), transparent 65%), radial-gradient(28rem 14rem at 0% 100%, color-mix(in oklab, var(--income) 12%, transparent), transparent 65%)",
};

/**
 * Top card of the goal. Two columns when the card is wide enough: the destination (target, what is
 * saved) on the left and the plan (monthly deposit, target and time to the apex) on the right; the
 * progress bar with the checkpoints closes the card.
 */
export function GoalHero({ summary }: { summary: GoalSummary }) {
  const plan = planLines(summary);
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
          {plan && "reached" in plan ? (
            <p className="text-sm text-income">{PLAN_REACHED}</p>
          ) : plan ? (
            <>
              <p className="text-sm text-muted-foreground">{plan.reach}</p>
              <p className="text-sm font-medium">{plan.term}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <GoalCheckpoints summary={summary} />
      </div>
    </section>
  );
}
