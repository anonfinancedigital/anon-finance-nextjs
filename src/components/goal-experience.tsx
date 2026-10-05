"use client";

import { useState } from "react";
import { GoalForm, type GoalFormValues } from "@/components/goal-form";
import { GoalSummary } from "@/components/goal-summary";
import { type Goal, type GoalSummary as Summary, summarize } from "@/lib/domain/freedom";
import { goalSchema } from "@/lib/validation/goal";

/**
 * Summary and form of the goal on one screen. While the form is open every valid draft recomputes
 * the summary in the browser (same schema and formulas as the server); an invalid draft keeps the
 * last valid result, and discarding the draft goes back to the saved goal.
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
  const now = new Date(nowIso);
  const [summary, setSummary] = useState<Summary | null>(saved ? summarize(saved, now) : null);

  function handleDraft(values: GoalFormValues | null) {
    if (values === null) {
      setSummary(saved ? summarize(saved, now) : null);
      return;
    }
    const parsed = goalSchema(now).safeParse(values);
    if (parsed.success) setSummary(summarize(parsed.data, now));
  }

  return (
    <>
      {summary && <GoalSummary summary={summary} />}
      <GoalForm initial={initial} onDraftChange={handleDraft} nowIso={nowIso} />
    </>
  );
}
