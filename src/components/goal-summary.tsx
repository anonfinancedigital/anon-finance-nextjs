import { GoalChart } from "@/components/goal-chart";
import { GoalHero } from "@/components/goal-hero";
import type { GoalSummary as Summary } from "@/lib/domain/freedom";

/** Hero card (target, plan and checkpoints bar) followed by the compound interest chart. */
export function GoalSummary({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-6">
      <GoalHero summary={summary} />
      <GoalChart summary={summary} />
    </div>
  );
}
