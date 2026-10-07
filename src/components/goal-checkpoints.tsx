import { cn } from "cn";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { GoalSummary } from "@/lib/domain/freedom";
import { checkpointLabel, todayLabel } from "@/lib/domain/freedom-copy";
import { formatCompactBRL } from "@/lib/domain/money";

/**
 * Progress bar (progress-colored fill) with the 25/50/75/100% checkpoints of the target as markers
 * on the rail (filled circle with a check when reached, smaller hollow circle otherwise) and a "Hoje" dot with
 * its label, the only place that shows the progress percentage. When the savings alone reach the
 * target (`reach`) the bar is scaled to the patrimony at the end of the term: the stretch after the
 * 100% marker is drawn in the returns color and gets a closing "Folga" label. Nothing here is interactive: no
 * pointer cursor, hover or focus state. Without the slack stretch, from the `@xl` container width the
 * labels sit centered under their markers; below it they form a 2×2 grid. With the stretch the markers
 * can sit at 5/10/15/20% of the bar and centered labels would overlap or clip, so the grid is always used.
 */
export function GoalCheckpoints({ summary }: { summary: GoalSummary }) {
  const label = todayLabel(summary);
  // The bar and the dot sit on the bar scale (capped at 100); the label carries the real percentage.
  const barValue = Math.min(100, summary.todayPositionBp / 100);
  const lastIndex = summary.checkpoints.length - 1;
  const { reach } = summary;
  const slackFrom = summary.checkpoints[lastIndex].positionBp / 100;

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
          {reach && slackFrom < 100 && (
            <span
              aria-hidden
              data-slack
              className="absolute top-1/2 right-0 h-3 -translate-y-1/2 rounded-r-full bg-returns"
              style={{ left: `${slackFrom}%` }}
            />
          )}
          {summary.checkpoints.map((c) => (
            <span
              key={c.fractionBp}
              aria-hidden
              data-reached={c.reached}
              className={cn(
                "absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2",
                c.reached ? "size-4 border-progress bg-progress text-background" : "size-3 border-muted-foreground bg-card",
              )}
              style={{ left: `${c.positionBp / 100}%` }}
            >
              {c.reached && <Check className="size-3" strokeWidth={3} />}
            </span>
          ))}
          <span
            aria-hidden
            className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${barValue}%` }}
          />
        </div>
      </div>

      <ol
        className={cn("grid grid-cols-2 gap-3", !reach && "@xl:relative @xl:block @xl:h-10")}
      >
        {summary.checkpoints.map((c, index) => (
          <li
            key={c.fractionBp}
            className={cn(
              "min-w-0 space-y-0.5 text-sm",
              !reach &&
                cn(
                  "@xl:absolute @xl:top-0 @xl:text-center",
                  index === lastIndex ? "@xl:right-0 @xl:text-right" : "@xl:-translate-x-1/2",
                ),
            )}
            style={index === lastIndex || reach ? undefined : { left: `${c.positionBp / 100}%` }}
          >
            <span className="block font-medium">{formatCompactBRL(c.valueCents)}</span>
            <span
              className={cn("block truncate text-xs whitespace-nowrap", c.reached ? "text-progress" : "text-muted-foreground")}
            >
              {checkpointLabel(c, index === lastIndex)}
            </span>
          </li>
        ))}
        {reach && (
          <li className="min-w-0 space-y-0.5 text-sm">
            <span className="block font-medium">{formatCompactBRL(reach.finalCents)}</span>
            <span className="block truncate text-xs whitespace-nowrap text-returns">
              Aos {summary.retirementAge} anos (Folga)
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}
