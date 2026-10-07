import { GoalChart } from "@/components/goal-chart";
import { GoalHero } from "@/components/goal-hero";
import type { GoalSummary as Summary } from "@/lib/domain/freedom";

/**
 * Hero card (income, indicators, assumptions and checkpoints bar) followed by the compound interest
 * chart. `onAdjust` opens the adjust drawer and `preview` marks values from an unapplied draft.
 */
export function GoalSummary({
  summary,
  onAdjust,
  preview,
}: {
  summary: Summary;
  onAdjust?: () => void;
  preview?: boolean;
}) {
  return (
    <div className="space-y-6">
      <GoalHero summary={summary} onAdjust={onAdjust} preview={preview} />
      <GoalChart summary={summary} />
    </div>
  );
}
