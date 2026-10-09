import type { Metadata } from "next";
import { OverviewClient } from "@/components/overview-client";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { goalsRepo } from "@/lib/db/repos/goals";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { currentMonth, monthRange, parseMonth } from "@/lib/domain/month";

export const metadata: Metadata = { title: "Visão Geral" };

const asString = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Loads the month's sealed rows; the browser opens them and computes everything (SIGILO-01, SIGILO-07). */
export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const { userId } = await requireSessionForPage();
  const params = await searchParams;
  const now = new Date();
  const month = parseMonth(asString(params.mes), now);
  const range = monthRange(month);
  const current = currentMonth(now);
  // A past month's set lacks categories created later; the forms need the current active ones.
  const beforeCurrent = month.year < current.year || (month.year === current.year && month.month < current.month);

  const [categories, activeCategories, occurrences, totalTransactions, goal] = await Promise.all([
    categoriesRepo.listForMonthSealed(userId, month),
    beforeCurrent ? categoriesRepo.listForMonthSealed(userId, current) : null,
    transactionsRepo.listByMonthSealed(userId, range),
    transactionsRepo.countAll(userId),
    goalsRepo.getSealed(userId),
  ]);

  return (
    <div>
      <OverviewClient
        payload={{ categories, occurrences, totalTransactions }}
        activeCategories={activeCategories}
        month={month}
        nowIso={now.toISOString()}
        params={{
          categoria: asString(params.categoria),
          subcategoria: asString(params.subcategoria),
          busca: asString(params.busca),
        }}
        currentParams={Object.entries(params).flatMap(([key, value]): [string, string][] =>
          typeof value === "string" ? [[key, value]] : [],
        )}
        hasGoal={goal !== null}
      />
    </div>
  );
}
