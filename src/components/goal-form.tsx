"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGoal } from "@/actions/goals";
import { GoalFields } from "@/components/goal-fields";
import type { useGoalDraft } from "@/components/use-goal-draft";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { BLANK_GOAL_VALUES, withZeroSaved } from "@/lib/validation/goal-draft";

export type GoalFormValues = {
  /** pt-BR text, e.g. "10.000,00". */
  monthlyIncome: string;
  /** pt-BR text, e.g. "150.000,00". */
  saved: string;
  /** DD/MM/AAAA. */
  birthDate: string;
  retirementAge: string;
  /** Real return in % a.a., pt-BR text, e.g. "8" or "6,5". */
  annualRate: string;
  /** Withdrawal rate in % a.a., pt-BR text, e.g. "6" or "4,5". */
  withdrawalRate: string;
};

/** Values of the form without a saved goal: empty fields and the Moderado scenario (8% real, withdrawal 5%). */
export const blank: GoalFormValues = BLANK_GOAL_VALUES;

/**
 * Form of the goal in the drawer. The host owns the draft (`useGoalDraft`) and decides when the form
 * is shown: `onSaved` runs after "Aplicar" saves and `onCancel` when the user gives up. The footer
 * with "Aplicar" and "Cancelar" stays fixed at the bottom of the drawer.
 */
export function GoalForm({
  draft,
  onSaved,
  onCancel,
  nowIso,
}: {
  draft: ReturnType<typeof useGoalDraft>;
  onSaved?: () => void;
  onCancel?: () => void;
  nowIso: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Server errors cover fields the user has not touched yet; once the user edits, the live ones win.
  const serverErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const errors = { ...serverErrors, ...draft.errors };

  function set(patch: Partial<GoalFormValues>) {
    setResult(null);
    draft.set(patch);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await saveGoal(withZeroSaved(draft.values));
      setResult(res);
      if (res.ok) {
        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3" aria-label="Objetivo de liberdade financeira">
      <GoalFields values={draft.values} set={set} errors={errors} nowIso={nowIso} variant="drawer" />

      {result && !result.ok && !Object.keys(serverErrors).length && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 mt-auto flex gap-2 border-t border-border bg-popover px-5 py-3">
        <Button type="submit" disabled={pending}>
          Aplicar
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
