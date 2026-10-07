import { Button } from "@/components/ui/button";
import type { GoalSummary } from "@/lib/domain/freedom";
import {
  EARLIER_TITLE,
  earlierOption,
  EXTRA_INCOME_TITLE,
  extraIncomeOption,
  SLACK_TITLE,
  slackIntro,
} from "@/lib/domain/freedom-copy";
import { slackOptions } from "@/lib/domain/slack";

/**
 * "Você tem folga" block: the patrimony reached without new deposits and one row per available
 * option (more income, stop earlier), each with a button that only hands the value to the caller;
 * nothing is saved here. Renders nothing when there is no option.
 */
export function GoalSlack({
  summary,
  onApplyIncome,
  onApplyAge,
}: {
  summary: GoalSummary;
  onApplyIncome: (cents: number) => void;
  onApplyAge: (age: number) => void;
}) {
  const { extraIncomeCents, earlierAge } = slackOptions(summary);
  if (extraIncomeCents === null && earlierAge === null) return null;

  return (
    <section aria-label={SLACK_TITLE} className="space-y-3 rounded-xl border border-border bg-subtle p-4">
      <div className="space-y-1">
        <h3 className="font-display text-base font-bold tracking-tight">{SLACK_TITLE}</h3>
        <p className="text-sm text-muted-foreground">{slackIntro(summary)}</p>
      </div>
      <ul className="space-y-3">
        {extraIncomeCents !== null && (
          <SlackRow
            title={EXTRA_INCOME_TITLE}
            {...extraIncomeOption(summary, extraIncomeCents)}
            onApply={() => onApplyIncome(extraIncomeCents)}
          />
        )}
        {earlierAge !== null && (
          <SlackRow
            title={EARLIER_TITLE}
            {...earlierOption(summary, earlierAge)}
            onApply={() => onApplyAge(earlierAge)}
          />
        )}
      </ul>
    </section>
  );
}

function SlackRow({
  title,
  result,
  button,
  onApply,
}: {
  title: string;
  result: string;
  button: string;
  onApply: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="font-medium">{result}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onApply}>
        {button}
      </Button>
    </li>
  );
}
