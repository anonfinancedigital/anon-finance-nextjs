import type { Metadata } from "next";
import { GoalExperience } from "@/components/goal-experience";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { isoToBR } from "@/lib/domain/date-br";
import { goalsRepo } from "@/lib/db/repos/goals";
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
        Informe a renda mensal que quer ter, o que já guardou, quando quer se aposentar e a taxa
        esperada. O alvo é o patrimônio que rende essa renda à taxa escolhida sem consumir o principal.
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
