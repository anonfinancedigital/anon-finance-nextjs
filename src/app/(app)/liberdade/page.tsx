import type { Metadata } from "next";
import { GoalExperience } from "@/components/goal-experience";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { isoToBR } from "@/lib/domain/date-br";
import { goalsRepo } from "@/lib/db/repos/goals";
import { formatBRL } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Ápice" };

/** Money as pt-BR text for the form fields, without the currency symbol. */
const moneyText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

export default async function FreedomPage() {
  const { userId } = await requireSessionForPage();
  const goal = await goalsRepo.get(userId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Independência financeira" title="Ápice" />
      <p className="text-sm text-muted-foreground">
        Defina a renda mensal que quer ter, o patrimônio acumulado e a idade do seu ápice patrimonial.
        A meta é o patrimônio que gera essa renda, sem consumir o principal, na taxa esperada
        escolhida: a base da sua independência financeira.
      </p>
      <GoalExperience
        saved={goal}
        initial={
          goal
            ? {
                monthlyIncome: moneyText(goal.monthlyIncomeCents),
                saved: moneyText(goal.savedCents),
                birthDate: isoToBR(goal.birthDate),
                retirementAge: String(goal.retirementAge),
                annualRate: String(goal.annualRateBp / 100),
              }
            : undefined
        }
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
