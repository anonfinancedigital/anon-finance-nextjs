import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Checkpoint, GoalSummary } from "@/lib/domain/freedom";
import { formatCompactBRL } from "@/lib/domain/money";
import { formatShare } from "@/lib/domain/percent";

function status(checkpoint: Checkpoint): string {
  if (checkpoint.reached) return "Atingido";
  if (checkpoint.ageYears === null) return "Sem previsão";
  return `Previsão: aos ${checkpoint.ageYears} anos`;
}

/** Progress bar (emerald fill with glow) and the 25/50/75/100% checkpoints of the target, each with its state in text. */
export function GoalCheckpoints({ summary }: { summary: GoalSummary }) {
  const share = formatShare(summary.progressBp);
  // The bar is capped at 100; the visible percentage lives in the hero, the bar only names it.
  const barValue = Math.min(100, summary.progressBp / 100);

  return (
    <section aria-label="Progresso e checkpoints" className="space-y-3">
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full bg-income opacity-40 blur-md"
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
            className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-foreground/60"
            style={{ left: `${c.positionBp / 100}%` }}
          />
        ))}
      </div>

      <ol className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
        {summary.checkpoints.map((c) => (
          <li key={c.fractionBp} className="space-y-0.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              {c.reached ? (
                <Check aria-hidden className="size-4 text-income" />
              ) : (
                <Circle aria-hidden className="size-4 text-muted-foreground" />
              )}
              {formatCompactBRL(c.valueCents)}
            </span>
            <span className={c.reached ? "block text-xs text-income" : "block text-xs text-muted-foreground"}>{status(c)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
