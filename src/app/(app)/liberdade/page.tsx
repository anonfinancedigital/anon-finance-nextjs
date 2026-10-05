import type { Metadata } from "next";
import { GoalExperience } from "@/components/goal-experience";
import { requireSessionForPage } from "@/lib/auth-guard";
import { isoToBR } from "@/lib/domain/date-br";
import { goalsRepo } from "@/lib/db/repos/goals";
import { formatRate } from "@/lib/domain/freedom-copy";
import { formatBRL } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Ápice" };

/** Money as pt-BR text for the form fields, without the currency symbol. */
const moneyText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

/** Rate as pt-BR text for the form fields, without the percent sign: 650 -> "6,5". */
const rateText = (bp: number) => formatRate(bp).replace(/%$/, "");

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
              annualRate: rateText(goal.annualRateBp),
              withdrawalRate: rateText(goal.withdrawalRateBp),
            }
          : undefined
      }
      nowIso={new Date().toISOString()}
    />
  );
}
