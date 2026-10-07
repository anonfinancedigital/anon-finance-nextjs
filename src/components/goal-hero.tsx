import { Info } from "lucide-react";
import { AssumptionChips } from "@/components/assumption-chips";
import { GoalCheckpoints } from "@/components/goal-checkpoints";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GoalSummary } from "@/lib/domain/freedom";
import {
  DEPOSIT_LABEL,
  depositText,
  formatTerm,
  HOW_DISCLAIMER,
  HOW_TITLE,
  howWeCalculate,
  incomeHeadline,
  summarySentence,
  TARGET_LABEL,
} from "@/lib/domain/freedom-copy";
import { formatCompactBRL } from "@/lib/domain/money";

// Soft violet glow from the top corner and a progress-colored one from the bottom, both from theme tokens.
const glow = {
  backgroundImage:
    "radial-gradient(36rem 16rem at 100% 0%, var(--glow-a), transparent 65%), radial-gradient(28rem 14rem at 0% 100%, color-mix(in oklab, var(--progress) 12%, transparent), transparent 65%)",
};

const noop = () => {};

/**
 * Top card of the goal: the desired income is the hero (largest number), followed by the summary
 * sentence, the two indicators side by side (needed patrimony and monthly deposit with its term),
 * the assumption chips, the progress bar and the "Como calculamos?" popover. `preview` marks values
 * that come from an unapplied draft.
 */
export function GoalHero({
  summary,
  onAdjust,
  preview = false,
}: {
  summary: GoalSummary;
  // SPEC_DEVIATION: optional until the page passes it (T24), so each commit still compiles.
  // Reason: GoalSummary and GoalExperience only wire `onAdjust` in T18/T24.
  onAdjust?: () => void;
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
          <p className="font-display text-4xl font-bold tracking-tight">{incomeHeadline(summary)}</p>
          <p className="text-sm text-muted-foreground">{summarySentence(summary)}</p>
        </div>

        <div className="grid gap-3 @md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-border bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{TARGET_LABEL}</p>
            <p className="font-display text-2xl font-bold tracking-tight">{formatCompactBRL(summary.targetCents)}</p>
          </div>
          <div className="space-y-1 rounded-xl border border-border bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{DEPOSIT_LABEL}</p>
            <p className="font-display text-2xl font-bold tracking-tight">{depositText(summary)}</p>
            {summary.months > 0 && <p className="text-sm text-muted-foreground">em {formatTerm(summary.months)}</p>}
          </div>
        </div>

        <AssumptionChips summary={summary} onAdjust={onAdjust ?? noop} />

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
  return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-link">Prévia</span>;
}
