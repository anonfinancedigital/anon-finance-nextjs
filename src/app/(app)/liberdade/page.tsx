import type { Metadata } from "next";
import { GoalForm } from "@/components/goal-form";
import { GoalSummary } from "@/components/goal-summary";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { summarize } from "@/lib/domain/freedom";
import { formatBRL } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Liberdade · Orçamento" };

/** Money as pt-BR text for the form fields, without the currency symbol. */
const moneyText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

export default async function FreedomPage() {
  const { userId } = await requireSessionForPage();
  const goal = await goalsRepo.get(userId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Objetivo" title="Liberdade" />
      <p className="text-sm text-muted-foreground">
        Informe a renda mensal que quer ter, o que já guardou e quando quer se aposentar. O alvo é o
        patrimônio que rende essa renda a 8% ao ano sem consumir o principal.
      </p>
      {goal && <GoalSummary summary={summarize(goal, new Date())} />}
      <GoalForm
        initial={
          goal
            ? {
                monthlyIncome: moneyText(goal.monthlyIncomeCents),
                saved: moneyText(goal.savedCents),
                birthDate: goal.birthDate,
                retirementAge: String(goal.retirementAge),
              }
            : undefined
        }
      />
    </div>
  );
}
