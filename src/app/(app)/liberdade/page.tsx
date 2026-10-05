import type { Metadata } from "next";
import { GoalExperience } from "@/components/goal-experience";
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
  );
}
