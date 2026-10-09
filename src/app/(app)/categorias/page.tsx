import type { Metadata } from "next";
import { CategoriesClient } from "@/components/categories-client";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { currentMonth, monthRange } from "@/lib/domain/month";

export const metadata: Metadata = { title: "Alocação" };

export default async function CategoriesPage() {
  const { userId } = await requireSessionForPage();
  const now = new Date();
  const month = currentMonth(now);
  // Sealed rows only: the browser opens them and computes the reference income.
  const [categories, occurrences, totalTransactions] = await Promise.all([
    categoriesRepo.listForMonthSealed(userId, month, now),
    transactionsRepo.listByMonthSealed(userId, monthRange(month)),
    transactionsRepo.countAll(userId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Alocação" />
      <p className="text-sm text-muted-foreground">
        Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.
      </p>
      <CategoriesClient
        payload={{ categories, occurrences, totalTransactions }}
        month={month}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
