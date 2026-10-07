import { Progress } from "@/components/ui/progress";
import type { GoalSummary } from "@/lib/domain/freedom";
import { checkpointLabel, todayLabel } from "@/lib/domain/freedom-copy";
import { formatCompactBRL } from "@/lib/domain/money";
import { cn } from "cn";

/**
 * Progress bar (progress-colored fill) with the 25/50/75/100% checkpoints of the target as markers
 * on the rail (filled circle when reached, smaller hollow circle otherwise) and a "Hoje" dot with
 * its label, the only place that shows the progress percentage. Nothing here is interactive: no
 * pointer cursor, hover or focus state. From the `@xl` container width the labels sit centered under
 * their markers; below it they form a 2×2 grid.
 */
export function GoalCheckpoints({ summary }: { summary: GoalSummary }) {
  const label = todayLabel(summary);
  // The bar and the dot are capped at 100; the label carries the real percentage.
  const barValue = Math.min(100, summary.progressBp / 100);
  const lastIndex = summary.checkpoints.length - 1;

  return (
    <section aria-label="Progresso e checkpoints" className="space-y-3">
      <div className="relative pt-6">
        <p
          className="absolute top-0 w-max max-w-full text-xs font-medium"
          style={{ left: `${barValue}%`, transform: `translateX(-${barValue}%)` }}
        >
          {label}
        </p>
        <div className="relative flex h-5 items-center">
          <span
            aria-hidden
            className="absolute top-1/2 left-0 h-3 -translate-y-1/2 rounded-full bg-progress opacity-40 blur-md"
            style={{ width: `${barValue}%` }}
          />
          <Progress className="h-3" indicatorClassName="bg-progress" value={barValue} aria-label={label} />
          {summary.checkpoints.map((c) => (
            <span
              key={c.fractionBp}
              aria-hidden
              data-reached={c.reached}
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                c.reached ? "size-4 border-progress bg-progress" : "size-3 border-muted-foreground bg-card",
              )}
              style={{ left: `${c.positionBp / 100}%` }}
            />
          ))}
          <span
            aria-hidden
            className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${barValue}%` }}
          />
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-3 @xl:relative @xl:block @xl:h-10">
        {summary.checkpoints.map((c, index) => (
          <li
            key={c.fractionBp}
            className={cn(
              "min-w-0 space-y-0.5 text-sm @xl:absolute @xl:top-0 @xl:text-center",
              index === lastIndex ? "@xl:right-0 @xl:text-right" : "@xl:-translate-x-1/2",
            )}
            style={index === lastIndex ? undefined : { left: `${c.positionBp / 100}%` }}
          >
            <span className="block font-medium">{formatCompactBRL(c.valueCents)}</span>
            <span
              className={cn("block truncate text-xs whitespace-nowrap", c.reached ? "text-progress" : "text-muted-foreground")}
            >
              {checkpointLabel(c, index === lastIndex)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
