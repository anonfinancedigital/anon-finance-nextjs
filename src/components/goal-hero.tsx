import { Check, Info } from "lucide-react";
import { AssumptionChips } from "@/components/assumption-chips";
import { GoalCheckpoints } from "@/components/goal-checkpoints";
import { GoalRobustness } from "@/components/goal-robustness";
import { GoalSlack } from "@/components/goal-slack";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GoalSummary } from "@/lib/domain/freedom";
import {
  DEPOSIT_LABEL,
  depositText,
  formatTerm,
  HOW_DISCLAIMER,
  HOW_TITLE,
  howWeCalculate,
  incomeHeadline,
  incomeNowLine,
  reachLine,
  summarySentence,
  TARGET_LABEL,
} from "@/lib/domain/freedom-copy";
import { formatCompactBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

// Soft violet glow from the top corner and a progress-colored one from the bottom, both from theme tokens.
const glow = {
  backgroundImage:
    "radial-gradient(36rem 16rem at 100% 0%, var(--glow-a), transparent 65%), radial-gradient(28rem 14rem at 0% 100%, color-mix(in oklab, var(--progress) 12%, transparent), transparent 65%)",
};

/**
 * Top card of the goal: the desired income is the hero (largest number), followed by the summary
 * sentence, the two indicators side by side (needed patrimony and monthly deposit with its term),
 * the slack block and the robustness line (only when the savings alone reach the target), the
 * assumption chips, the progress bar and the "Como calculamos?" popover. `preview` marks values
 * that come from an unapplied draft; `onApplyIncome` and `onApplyAge` hand the slack options to the page.
 */
export function GoalHero({
  summary,
  onAdjust,
  onApplyIncome,
  onApplyAge,
  preview = false,
}: {
  summary: GoalSummary;
  onAdjust: () => void;
  onApplyIncome: (cents: number) => void;
  onApplyAge: (age: number) => void;
  preview?: boolean;
}) {
  return (
    <section
      aria-label="Resumo do objetivo"
      style={glow}
      className="@container overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Renda desejada</p>
            {preview && <PreviewLabel />}
          </div>
          <p className="font-display text-4xl font-bold tracking-tight">
            {incomeHeadline(summary)}
          </p>
          <p className="text-sm text-muted-foreground">
            {summarySentence(summary)}
          </p>
        </div>

        <div className="grid gap-3 @md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-border bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{TARGET_LABEL}</p>
            <p className="font-display text-2xl font-bold tracking-tight">
              {formatCompactBRL(summary.targetCents)}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-border bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{DEPOSIT_LABEL}</p>
            <p
              className={cn(
                "flex items-center gap-2 font-display text-2xl font-bold tracking-tight",
                summary.reach && "text-income",
              )}
            >
              {depositText(summary)}
              {summary.reach && <Check aria-hidden className="size-6 shrink-0" strokeWidth={3} />}
            </p>
            {summary.reach ? (
              <p className="text-sm text-muted-foreground">{reachLine(summary)}</p>
            ) : summary.remainingCents === 0 ? (
              <p className="text-sm text-muted-foreground">{incomeNowLine(summary)}</p>
            ) : (
              summary.months > 0 && (
                <p className="text-sm text-muted-foreground">
                  em {formatTerm(summary.months)}
                </p>
              )
            )}
          </div>
        </div>

        {summary.reach && (
          <div className="space-y-3">
            <GoalSlack summary={summary} onApplyIncome={onApplyIncome} onApplyAge={onApplyAge} />
            <GoalRobustness summary={summary} />
          </div>
        )}

        <AssumptionChips premises={summary} summary={summary} onAdjust={onAdjust} />

        <Popover>
          <PopoverTrigger className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30">
            <Info aria-hidden className="size-4" />
            Como calculamos?
          </PopoverTrigger>
          <PopoverContent className="space-y-2">
            <p className="font-medium">{HOW_TITLE}</p>
            <p>{howWeCalculate(summary)}</p>
            <p className="text-xs text-muted-foreground">{HOW_DISCLAIMER}</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="border-t border-border px-5 py-4">
        <GoalCheckpoints summary={summary} />
      </div>
    </section>
  );
}

function PreviewLabel() {
  return (
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-link">
      Prévia
    </span>
  );
}
