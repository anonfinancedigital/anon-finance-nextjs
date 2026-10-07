import type { Metadata } from "next";
import { BudgetCharts } from "@/components/budget-charts";
import { CategoryOverview } from "@/components/category-overview";
import { GettingStartedCard } from "@/components/getting-started-card";
import { ContentCard } from "@/components/content-card";
import { MonthPicker } from "@/components/month-picker";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { PageHeader } from "@/components/page-header";
import { SummaryCards } from "@/components/summary-cards";
import { TransactionFilter } from "@/components/transaction-filter";
import { TransactionList } from "@/components/transaction-list";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { goalsRepo } from "@/lib/db/repos/goals";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { monthHref, monthRange, parseMonth } from "@/lib/domain/month";
import { deriveMonthState, deriveSetup, monthLongName, previousMonth } from "@/lib/domain/onboarding";
import { buildSpendingPaceViews } from "@/lib/domain/spending-pace";
import {
  filterTransactions,
  parseSearch,
  parseTransactionFilter,
  searchTransactions,
} from "@/lib/domain/transaction-filter";

/** Today as AAAA-MM-DD in America/Sao_Paulo. */
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export const metadata: Metadata = { title: "Visão Geral" };

export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const { userId } = await requireSessionForPage();
  const params = await searchParams;
  const { mes, categoria, subcategoria, busca } = params;
  const month = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const range = monthRange(month);

  const [categories, activeCategories, transactions, totals, totalTransactions, goal] = await Promise.all([
    categoriesRepo.listForMonth(userId, month),
    // Forms only accept active categories: one deleted after `month` still shows in the summary.
    categoriesRepo.list(userId),
    transactionsRepo.listByMonth(userId, range),
    transactionsRepo.monthTotals(userId, range),
    transactionsRepo.countAll(userId),
    goalsRepo.get(userId),
  ]);
  const summary = buildMonthlySummary({ categories, ...totals });
  const paces = buildSpendingPaceViews({
    month,
    today: todayInSaoPaulo(),
    categories: summary.rows,
    occurrences: transactions,
  });
  // The filter only narrows the list; summary and charts keep the whole month.
  const filter = parseTransactionFilter(
    {
      categoria: typeof categoria === "string" ? categoria : undefined,
      subcategoria: typeof subcategoria === "string" ? subcategoria : undefined,
    },
    categories,
  );

  const search = parseSearch(typeof busca === "string" ? busca : undefined);
  const shown = searchTransactions(filterTransactions(transactions, filter), search);

  const monthIsEmpty = transactions.length === 0;
  const setup = deriveSetup({
    categories: activeCategories.length,
    transactions: totalTransactions,
    hasGoal: goal !== null,
  });
  const monthState = deriveMonthState({ monthTransactions: transactions.length, totalTransactions });
  const previous = previousMonth(month);
  const emphasis = setup.complete ? "primary" : "secondary";
  const showFilters = !monthIsEmpty || filter.categoryId !== null || search !== "";
  const today = todayInSaoPaulo();
  const currentParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  );

  return (
    <div className="space-y-6 pb-32">
      <PageHeader title="Visão Geral">
        <MonthPicker month={month} />
      </PageHeader>

      <GettingStartedCard setup={setup} categories={activeCategories} defaultDate={today} />

      <SummaryCards
        incomeCents={summary.incomeCents}
        spentCents={summary.spentCents}
        balanceCents={summary.balanceCents}
        empty={monthIsEmpty}
      />

      <CategoryOverview rows={summary.rows} hideCta={!setup.complete} />

      {/* Keyed by month so the "Incluir investimentos" choice resets when the month changes. */}
      <BudgetCharts
        key={`${month.year}-${month.month}`}
        rows={summary.rows}
        spentCents={summary.spentCents}
        paces={paces}
      />

      <ContentCard
        title="Transações do mês"
        note={shown.length > 0 ? `${shown.length} lançamentos` : undefined}
        action={
          <NewTransactionButton
            variant="header"
            emphasis={emphasis}
            categories={activeCategories}
            defaultDate={today}
          />
        }
        bodyClassName="space-y-4"
      >
        {showFilters && (
          <div className="px-6">
            <TransactionFilter categories={categories} filter={filter} search={search} />
          </div>
        )}
        <TransactionList
          transactions={shown}
          categories={activeCategories}
          filtered={filter.categoryId !== null}
          searching={search !== ""}
          emptyState={monthState}
          monthName={monthLongName(month)}
          previousHref={monthHref(currentParams, `${previous.year}-${String(previous.month).padStart(2, "0")}`)}
          previousMonthName={monthLongName(previous)}
          defaultDate={today}
          emphasis="secondary"
        />
      </ContentCard>

      <NewTransactionButton emphasis={emphasis} categories={activeCategories} defaultDate={today} />
    </div>
  );
}
