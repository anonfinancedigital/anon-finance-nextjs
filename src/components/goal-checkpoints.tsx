import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Checkpoint, GoalSummary } from "@/lib/domain/freedom";
import { formatCompactBRL } from "@/lib/domain/money";
import { formatShare } from "@/lib/domain/percent";
import { cn } from "cn";

function status(checkpoint: Checkpoint): string {
  if (checkpoint.reached) return "Atingido";
  if (checkpoint.ageYears === null) return "Sem previsão";
  return `Previsão: aos ${checkpoint.ageYears} anos`;
}

/**
 * Progress bar (emerald fill with glow) with the 25/50/75/100% checkpoints of the target as markers
 * on the rail (check when reached, empty circle otherwise), each with its state in text. From the
 * `@xl` container width the labels sit centered under their markers; below it they form a 2×2 grid.
 */
export function GoalCheckpoints({ summary }: { summary: GoalSummary }) {
  const share = formatShare(summary.progressBp);
  // The bar is capped at 100; the visible percentage lives in the hero, the bar only names it.
  const barValue = Math.min(100, summary.progressBp / 100);
  const lastIndex = summary.checkpoints.length - 1;

  return (
    <section aria-label="Progresso e checkpoints" className="space-y-3">
      <div className="relative flex h-5 items-center">
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-3 -translate-y-1/2 rounded-full bg-income opacity-40 blur-md"
          style={{ width: `${barValue}%` }}
        />
        <Progress
          className="h-3"
          indicatorClassName="bg-income"
          value={barValue}
          aria-label={`Progresso do objetivo: ${share}`}
        />
        {summary.checkpoints.map((c) => (
          <span
            key={c.fractionBp}
            aria-hidden
            data-reached={c.reached}
            className={cn(
              "absolute top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2",
              c.reached ? "border-income bg-income text-white" : "border-muted-foreground bg-card",
            )}
            style={{ left: `${c.positionBp / 100}%` }}
          >
            {c.reached && <Check className="size-3" strokeWidth={3} />}
          </span>
        ))}
      </div>

      <ol className="grid grid-cols-2 gap-3 @xl:relative @xl:block @xl:h-10">
        {summary.checkpoints.map((c, index) => (
          <li
            key={c.fractionBp}
            className={cn(
              "space-y-0.5 text-sm @xl:absolute @xl:top-0 @xl:text-center",
              index === lastIndex ? "@xl:right-0 @xl:text-right" : "@xl:-translate-x-1/2",
            )}
            style={index === lastIndex ? undefined : { left: `${c.positionBp / 100}%` }}
          >
            <span className="block font-medium">{formatCompactBRL(c.valueCents)}</span>
            <span className={c.reached ? "block text-xs text-income" : "block text-xs text-muted-foreground"}>{status(c)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
