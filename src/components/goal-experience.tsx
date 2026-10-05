"use client";

import { useState } from "react";
import { GoalForm, type GoalFormValues } from "@/components/goal-form";
import { GoalSummary } from "@/components/goal-summary";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type Goal, type GoalSummary as Summary, summarize } from "@/lib/domain/freedom";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { goalSchema } from "@/lib/validation/goal";

const DRAWER_INTRO = "Simule o ápice: renda, patrimônio e idade.";

const INTRO =
  "Defina a renda mensal que quer ter, o patrimônio acumulado e a idade do seu ápice patrimonial. A meta é o patrimônio que, na taxa de retirada do cenário de rentabilidade escolhido, gera essa renda: a base da sua independência financeira.";

/** Target and monthly deposit of the current preview, shown on top of the sheet so they stay in view. */
function DrawerSummary({ summary }: { summary: Summary | null }) {
  const deposit = !summary
    ? "—"
    : summary.monthlyCents === null
      ? "Prazo encerrado"
      : `${formatBRL(summary.monthlyCents)} / mês`;

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <div>
        <dt className="text-muted-foreground">Meta Patrimonial</dt>
        <dd className="font-display font-bold">{summary ? formatBRL(summary.targetCents) : "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Aporte Estratégico Mensal</dt>
        <dd className="font-display font-bold">{deposit}</dd>
      </div>
    </dl>
  );
}

/**
 * Page of the goal: summary on the screen and the form in a side sheet. While the sheet is open
 * every valid draft recomputes the summary in the browser (same schema and formulas as the
 * server); an invalid draft keeps the last valid result, and closing without saving goes back to
 * the saved goal. On wide screens the page makes room for the sheet instead of sitting under it.
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
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(saved ? summarize(saved, now) : null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSummary(saved ? summarize(saved, now) : null);
  }

  function handleDraft(values: GoalFormValues) {
    const parsed = goalSchema(now).safeParse(values);
    if (parsed.success) setSummary(summarize(parsed.data, now));
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      <div className={cn("space-y-6 transition-[padding] duration-200", open && "lg:pr-96")}>
        <PageHeader title="Ápice">
          {saved && (
            <SheetTrigger asChild>
              <Button type="button" variant="outline">
                Calibrar Parâmetros
              </Button>
            </SheetTrigger>
          )}
        </PageHeader>

        {summary && <GoalSummary summary={summary} />}

        {!saved && !summary && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
            <p className="text-sm text-muted-foreground">{INTRO}</p>
            <SheetTrigger asChild>
              <Button type="button">Definir objetivo</Button>
            </SheetTrigger>
          </section>
        )}
      </div>

      <SheetContent onInteractOutside={(event) => event.preventDefault()}>
        <div className="space-y-2 pr-8">
          <SheetTitle>Calibrar Parâmetros</SheetTitle>
          <SheetDescription>{DRAWER_INTRO}</SheetDescription>
        </div>
        <DrawerSummary summary={summary} />
        <GoalForm
          initial={initial}
          onDraftChange={handleDraft}
          onSaved={() => setOpen(false)}
          onCancel={() => handleOpenChange(false)}
          nowIso={nowIso}
        />
      </SheetContent>
    </Sheet>
  );
}
