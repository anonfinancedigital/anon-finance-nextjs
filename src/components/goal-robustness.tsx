import type { GoalSummary } from "@/lib/domain/freedom";
import { robustnessText } from "@/lib/domain/freedom-copy";
import { robustnessCheck } from "@/lib/domain/slack";

/**
 * One discreet line testing the conclusion against a 6% real return: secondary text when the
 * target is still reached, attention color with the needed deposit when it is not. Renders nothing
 * when the test does not apply.
 */
export function GoalRobustness({ summary }: { summary: GoalSummary }) {
  const check = robustnessCheck(summary);
  if (!check) return null;
  return (
    <p className={check.reaches ? "text-sm text-muted-foreground" : "text-sm font-medium text-warning"}>
      {robustnessText(check)}
    </p>
  );
}
