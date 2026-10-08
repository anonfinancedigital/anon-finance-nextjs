"use client";

import { useCallback, useMemo, useState } from "react";
import { type Goal, type GoalSummary, summarize } from "@/lib/domain/freedom";
import { BLANK_GOAL_VALUES, evaluateDraft, type GoalFormValues } from "@/lib/validation/goal-draft";

type FieldName = keyof GoalFormValues;

/**
 * Draft of the goal shared by the drawer and the empty state. The summary, the errors and the
 * dirty flag are derived at every render (no blur or submit needed); `summary` keeps the last
 * valid result while the values are invalid. `errors` only lists fields the user has touched.
 * `birthDate` (DD/MM/AAAA) is the user's, not editable here: without a saved goal the blank form
 * starts with it, also after `reset`.
 */
export function useGoalDraft({
  saved,
  initial,
  birthDate = "",
  nowIso,
}: {
  saved: Goal | null;
  initial?: GoalFormValues;
  birthDate?: string;
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const savedSummary = useMemo(() => (saved ? summarize(saved, now) : null), [saved, now]);
  const baseline = initial ?? null;
  const startValues = useMemo(() => initial ?? { ...BLANK_GOAL_VALUES, birthDate }, [initial, birthDate]);

  const [state, setState] = useState<{
    values: GoalFormValues;
    lastValid: GoalSummary | null;
    touched: Partial<Record<FieldName, true>>;
  }>(() => ({ values: startValues, lastValid: savedSummary, touched: {} }));

  const draft = evaluateDraft(state.values, baseline, now, state.lastValid);

  const set = useCallback(
    (patch: Partial<GoalFormValues>) => {
      setState((prev) => {
        const values = { ...prev.values, ...patch };
        const touched = { ...prev.touched };
        for (const key of Object.keys(patch) as FieldName[]) touched[key] = true;
        return { values, touched, lastValid: evaluateDraft(values, baseline, now, prev.lastValid).summary };
      });
    },
    [baseline, now],
  );

  const reset = useCallback(
    () => setState({ values: startValues, lastValid: savedSummary, touched: {} }),
    [startValues, savedSummary],
  );

  const errors: GoalDraftErrors = {};
  for (const key of Object.keys(draft.errors) as FieldName[]) {
    if (state.touched[key]) errors[key] = draft.errors[key];
  }

  return {
    values: state.values,
    set,
    summary: draft.summary,
    savedSummary,
    dirty: draft.dirty,
    errors,
    touched: state.touched,
    reset,
  };
}

type GoalDraftErrors = Partial<Record<FieldName, string>>;
