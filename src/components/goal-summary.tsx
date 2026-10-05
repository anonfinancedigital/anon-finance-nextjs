import { GoalChart } from "@/components/goal-chart";
import { GoalCheckpoints } from "@/components/goal-checkpoints";
import { GoalHero } from "@/components/goal-hero";
import type { GoalSummary as Summary } from "@/lib/domain/freedom";

/** Hero card with the target and the monthly deposit, the compound interest chart and the checkpoints bar. */
export function GoalSummary({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-6">
      <GoalHero summary={summary} />
      <GoalChart summary={summary} />
      <GoalCheckpoints summary={summary} />
    </div>
  );
}
