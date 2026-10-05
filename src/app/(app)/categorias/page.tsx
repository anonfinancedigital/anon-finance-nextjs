import type { Metadata } from "next";
import { CategoryEditor } from "@/components/category-editor";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { referenceIncomeText } from "@/lib/domain/money";
import { currentMonth, monthRange } from "@/lib/domain/month";

export const metadata: Metadata = { title: "Alocação" };

export default async function CategoriesPage() {
  const { userId } = await requireSessionForPage();
  const [categories, totals] = await Promise.all([
    categoriesRepo.list(userId),
    transactionsRepo.monthTotals(userId, monthRange(currentMonth(new Date()))),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Planejamento" title="Alocação" />
      <p className="text-sm text-muted-foreground">Alocação total obrigatória: 100% da receita</p>
      <p className="text-sm text-muted-foreground">
        Defina quanto da receita do mês vai para cada categoria. A soma deve ser 100%.
      </p>
      <CategoryEditor categories={categories} initialIncome={referenceIncomeText(totals.incomeCents)} />
    </div>
  );
}
