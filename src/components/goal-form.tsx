"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGoalSealed } from "@/actions/goals-sealed";
import { GoalFields } from "@/components/goal-fields";
import type { useGoalDraft } from "@/components/use-goal-draft";
import { Button } from "@/components/ui/button";
import { useVault } from "@/components/vault-provider";
import { type ActionResult, invalidInput, SAVE_FAILED } from "@/lib/action-result";
import { goalSchema } from "@/lib/validation/goal";
import { type GoalFormValues, withZeroSaved } from "@/lib/validation/goal-draft";
import { sealGoal } from "@/lib/vault/seal";

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
  const { dek, userId } = useVault();
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
    // Same schema and messages the server used to apply, checked before anything is sealed (SIGILO-09).
    const parsed = goalSchema(new Date()).safeParse(withZeroSaved(draft.values));
    if (!parsed.success) {
      setResult(invalidInput(parsed.error));
      return;
    }
    startTransition(async () => {
      let res: ActionResult;
      try {
        res = await saveGoalSealed(await sealGoal(dek, userId, parsed.data));
      } catch {
        res = { ok: false, error: SAVE_FAILED };
      }
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

      <div className="sticky bottom-0 z-20 -mx-5 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] mt-auto flex gap-2 border-t border-border bg-popover px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
