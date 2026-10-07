"use client";

import { useState } from "react";
import { DiscardDialog } from "@/components/discard-dialog";
import { DrawerSummary } from "@/components/drawer-summary";
import { GoalEmptyState } from "@/components/goal-empty-state";
import { GoalForm } from "@/components/goal-form";
import { GoalSummary } from "@/components/goal-summary";
import { useGoalDraft } from "@/components/use-goal-draft";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Goal } from "@/lib/domain/freedom";
import {
  ADJUST_LABEL,
  DRAWER_INTRO,
  SUBTITLE,
} from "@/lib/domain/freedom-copy";
import { referenceIncomeText } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import type { GoalFormValues } from "@/lib/validation/goal-draft";

/**
 * Page of the goal: summary on the screen and the form in a side sheet. While the sheet is open
 * every valid draft recomputes the summary in the browser (same schema and formulas as the
 * server) and the page shows "Prévia"; an invalid draft keeps the last valid result. Leaving the
 * sheet with unapplied changes asks before discarding them. Without a saved goal the page is the
 * inline simulation. On wide screens the page makes room for the sheet instead of sitting under it.
 */
export function GoalExperience({
  saved,
  initial,
  nowIso,
}: {
  saved: Goal | null;
  initial?: GoalFormValues;
  nowIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const draft = useGoalDraft({ saved, initial, nowIso });
  const { summary } = draft;

  /** Closing with unapplied changes asks first; without changes it closes right away. */
  function requestClose() {
    if (draft.dirty) setConfirmingDiscard(true);
    else setOpen(false);
  }

  /** Slack buttons only fill the draft and open the drawer to preview it; saving stays in the form. */
  function applyIncome(cents: number) {
    draft.set({ monthlyIncome: referenceIncomeText(cents) });
    setOpen(true);
  }

  function applyAge(age: number) {
    draft.set({ retirementAge: String(age) });
    setOpen(true);
  }

  function discard() {
    draft.reset();
    setConfirmingDiscard(false);
    setOpen(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
      modal={false}
    >
      <div
        className={cn(
          "space-y-6 transition-[padding] duration-200",
          open && "lg:pr-96",
        )}
      >
        <PageHeader title="Ápice" subtitle={SUBTITLE}>
          {saved && (
            <SheetTrigger asChild>
              <Button type="button" variant="outline">
                {ADJUST_LABEL}
              </Button>
            </SheetTrigger>
          )}
        </PageHeader>

        {saved ? (
          summary && (
            <GoalSummary
              summary={summary}
              onAdjust={() => setOpen(true)}
              onApplyIncome={applyIncome}
              onApplyAge={applyAge}
              preview={draft.dirty}
            />
          )
        ) : (
          <GoalEmptyState
            draft={draft}
            onAdjust={() => setOpen(true)}
            nowIso={nowIso}
          />
        )}
      </div>

      <SheetContent onInteractOutside={(event) => event.preventDefault()}>
        <div className="space-y-2 pr-8">
          <SheetTitle>{ADJUST_LABEL}</SheetTitle>
          <SheetDescription>{DRAWER_INTRO}</SheetDescription>
        </div>
        <DrawerSummary
          summary={summary}
          savedSummary={draft.savedSummary}
          dirty={draft.dirty}
        />
        <GoalForm
          draft={draft}
          onSaved={() => setOpen(false)}
          onCancel={requestClose}
          nowIso={nowIso}
        />
      </SheetContent>

      <DiscardDialog
        open={confirmingDiscard}
        onDiscard={discard}
        onKeepEditing={() => setConfirmingDiscard(false)}
      />
    </Sheet>
  );
}
