"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GoalExperience } from "@/components/goal-experience";
import { LOAD_ERROR_MESSAGE, useOpened } from "@/components/use-opened";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isoToBR } from "@/lib/domain/date-br";
import type { Goal } from "@/lib/domain/freedom";
import { formatRate } from "@/lib/domain/freedom-copy";
import { formatBRL } from "@/lib/domain/money";
import { openBirthDate, openGoal } from "@/lib/vault/open";
import type { Ct, GoalDto } from "@/lib/vault/types";

/** Money as pt-BR text for the form fields, without the currency symbol. */
const moneyText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

/** Rate as pt-BR text for the form fields, without the percent sign: 650 -> "6,5". */
const rateText = (bp: number) => formatRate(bp).replace(/%$/, "");

type Opened = { birthDate: string; goal: Goal | null } | null;

/**
 * Opens the sealed birth date and goal and renders the goal page with them. Without a birth date
 * the user goes to /data-nascimento; a field that fails to open shows the fixed load error (SIGILO-06).
 */
export function GoalLoader({
  savedDto,
  birthDateCt,
  nowIso,
}: {
  savedDto: GoalDto | null;
  birthDateCt: Ct | null;
  nowIso: string;
}) {
  const router = useRouter();
  const { data, error, loading } = useOpened<Opened>(
    async (dek, userId) => {
      const birthDate = await openBirthDate(dek, userId, birthDateCt);
      if (birthDate === null) return null;
      return { birthDate, goal: savedDto ? await openGoal(dek, userId, savedDto, birthDate) : null };
    },
    [savedDto, birthDateCt],
  );

  // A refresh after a save sends new rows: keep the page (and the open sheet) on screen with the
  // last opened goal until the new one is open.
  const [last, setLast] = useState<Opened>(null);
  if (data && data !== last) setLast(data);
  const opened = data ?? last;

  const noBirthDate = !loading && !error && data === null;
  useEffect(() => {
    if (noBirthDate) router.replace("/data-nascimento");
  }, [noBirthDate, router]);

  const initial = useMemo(() => {
    const goal = opened?.goal;
    if (!opened || !goal) return undefined;
    return {
      monthlyIncome: moneyText(goal.monthlyIncomeCents),
      saved: moneyText(goal.savedCents),
      birthDate: isoToBR(opened.birthDate),
      retirementAge: String(goal.retirementAge),
      annualRate: rateText(goal.annualRateBp),
      withdrawalRate: rateText(goal.withdrawalRateBp),
    };
  }, [opened]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{LOAD_ERROR_MESSAGE}</AlertDescription>
      </Alert>
    );
  }
  if (!opened || noBirthDate) {
    return <div aria-busy="true" aria-label="Carregando" className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }
  return (
    <GoalExperience
      saved={opened.goal}
      initial={initial}
      birthDate={isoToBR(opened.birthDate)}
      nowIso={nowIso}
    />
  );
}
