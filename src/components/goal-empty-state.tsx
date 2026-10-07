"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGoal } from "@/actions/goals";
import { AssumptionChips } from "@/components/assumption-chips";
import { GoalChart } from "@/components/goal-chart";
import { GoalFields } from "@/components/goal-fields";
import { Button } from "@/components/ui/button";
import { useGoalDraft } from "@/components/use-goal-draft";
import type { ActionResult } from "@/lib/action-result";
import { type Goal, presetFor, summarize } from "@/lib/domain/freedom";
import {
  DEPOSIT_LABEL,
  depositText,
  summarySentence,
} from "@/lib/domain/freedom-copy";
import { parseRate } from "@/lib/validation/goal";

const HEADLINE = "Quanto você precisa para viver de renda?";
const SUPPORT =
  "Diga a renda que quer ter e veja quanto guardar por mês para chegar lá.";
const PLACEHOLDER = "Preencha a renda e a idade para ver o aporte";

// Fixed example (and fixed "now") behind the faded chart: it only shows the shape of the result.
const EXAMPLE_GOAL: Goal = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 5_000_000,
  birthDate: "1990-01-01",
  retirementAge: 50,
  annualRateBp: 800,
  withdrawalRateBp: 500,
};
const EXAMPLE_SUMMARY = summarize(
  EXAMPLE_GOAL,
  new Date("2026-01-01T12:00:00Z"),
);

const SCENARIO_NAMES: Record<number, string> = {
  600: "conservador",
  800: "moderado",
  1000: "agressivo",
};

/** Scenario chip for the empty state while there is no valid summary: the name comes from the typed rates. */
function scenarioChip(values: {
  annualRate: string;
  withdrawalRate: string;
}): string {
  const annual = parseRate(values.annualRate);
  const withdrawal = parseRate(values.withdrawalRate);
  const preset =
    annual.ok && withdrawal.ok
      ? presetFor(annual.value, withdrawal.value)
      : null;
  return `Cenário ${preset === null ? "personalizado" : SCENARIO_NAMES[preset]}`;
}

/**
 * Empty state of the page: the user types income and age right here and sees the deposit before
 * saving. The draft belongs to the host (shared with the drawer, so "Ajustar" edits the same
 * values) and uses the same schema and formulas as the drawer; the Moderado scenario is the default.
 */
export function GoalEmptyState({
  draft,
  onAdjust,
  nowIso,
}: {
  draft: ReturnType<typeof useGoalDraft>;
  onAdjust: () => void;
  nowIso: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const { summary } = draft;

  const serverErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const errors = { ...serverErrors, ...draft.errors };

  function set(patch: Parameters<typeof draft.set>[0]) {
    setResult(null);
    draft.set(patch);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await saveGoal(draft.values);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={save}
        aria-label="Simular objetivo"
        className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {HEADLINE}
          </h2>
          <p className="text-sm text-muted-foreground">{SUPPORT}</p>
        </div>

        <GoalFields
          values={draft.values}
          set={set}
          errors={errors}
          nowIso={nowIso}
          variant="inline"
        />

        {summary ? (
          <AssumptionChips summary={summary} onAdjust={onAdjust} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-border bg-subtle px-3 py-1 text-xs">
              {scenarioChip(draft.values)}
            </span>
            <button
              type="button"
              onClick={onAdjust}
              className="cursor-pointer rounded-md text-sm text-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Ajustar
            </button>
          </div>
        )}

        <div
          aria-live="polite"
          className="space-y-1 rounded-xl border border-border bg-subtle p-4"
        >
          {summary ? (
            <>
              <p className="text-sm text-muted-foreground">
                {summarySentence(summary)}
              </p>
              <p className="text-sm text-muted-foreground">{DEPOSIT_LABEL}</p>
              <p className="font-display text-3xl font-bold tracking-tight">
                {depositText(summary)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{PLACEHOLDER}</p>
          )}
        </div>

        {result && !result.ok && !Object.keys(serverErrors).length && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          Salvar objetivo
        </Button>
      </form>

      {!summary && (
        <div aria-hidden className="pointer-events-none opacity-40">
          <GoalChart summary={EXAMPLE_SUMMARY} />
        </div>
      )}
    </section>
  );
}
