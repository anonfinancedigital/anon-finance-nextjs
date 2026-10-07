import { GoalChart } from "@/components/goal-chart";
import { GoalHero } from "@/components/goal-hero";
import type { GoalSummary as Summary } from "@/lib/domain/freedom";

/**
 * Hero card (income, indicators, assumptions and checkpoints bar) followed by the compound interest
 * chart. `onAdjust` opens the adjust drawer, `onApplyIncome` and `onApplyAge` apply a slack option to
 * the draft and `preview` marks values from an unapplied draft.
 */
export function GoalSummary({
  summary,
  onAdjust,
  onApplyIncome,
  onApplyAge,
  preview,
}: {
  summary: Summary;
  onAdjust: () => void;
  onApplyIncome?: (cents: number) => void;
  onApplyAge?: (age: number) => void;
  preview?: boolean;
}) {
  return (
    <div className="space-y-6">
      <GoalHero
        summary={summary}
        onAdjust={onAdjust}
        onApplyIncome={onApplyIncome}
        onApplyAge={onApplyAge}
        preview={preview}
      />
      <GoalChart summary={summary} />
    </div>
  );
}
