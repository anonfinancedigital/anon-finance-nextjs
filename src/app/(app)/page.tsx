import { ArrowDownLeftIcon, ArrowUpRightIcon, WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import { BudgetCharts } from "@/components/budget-charts";
import { CategoryOverview } from "@/components/category-overview";
import { ContentCard } from "@/components/content-card";
import { MonthPicker } from "@/components/month-picker";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { PageHeader } from "@/components/page-header";
import { TransactionFilter } from "@/components/transaction-filter";
import { TransactionList } from "@/components/transaction-list";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { formatBRL } from "@/lib/domain/money";
import { monthRange, parseMonth } from "@/lib/domain/month";
import { buildSpendingPace } from "@/lib/domain/spending-pace";
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
  const { mes, categoria, subcategoria, busca } = await searchParams;
  const month = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const range = monthRange(month);

  const [categories, activeCategories, transactions, totals] = await Promise.all([
    categoriesRepo.listForMonth(userId, month),
    // Forms only accept active categories: one deleted after `month` still shows in the summary.
    categoriesRepo.list(userId),
    transactionsRepo.listByMonth(userId, range),
    transactionsRepo.monthTotals(userId, range),
  ]);
  const summary = buildMonthlySummary({ categories, ...totals });
  const pace = buildSpendingPace({
    month,
    today: todayInSaoPaulo(),
    totalTargetCents: summary.rows.reduce((total, row) => total + row.targetCents, 0),
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

  const cards = [
    {
      label: "Receita",
      testId: "total-income",
      cents: summary.incomeCents,
      icon: ArrowDownLeftIcon,
      tone: "text-income",
      iconTone: "bg-income/15 text-income",
    },
    {
      label: "Gasto",
      testId: "total-spent",
      cents: summary.spentCents,
      icon: ArrowUpRightIcon,
      tone: "text-destructive",
      iconTone: "bg-destructive/15 text-destructive",
    },
    {
      label: "Saldo",
      testId: "total-balance",
      cents: summary.balanceCents,
      icon: WalletIcon,
      tone: summary.balanceCents < 0 ? "text-destructive" : "text-link",
      iconTone: "bg-primary/15 text-link",
    },
  ];

  return (
    <div className="space-y-6 pb-32">
      <PageHeader eyebrow="Visão geral" title="Visão Geral">
        <MonthPicker month={month} />
      </PageHeader>

      <dl className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, testId, cents, icon: Icon, tone, iconTone }) => (
          <div
            key={testId}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="flex items-center justify-between pb-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <span className={`flex size-9 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon aria-hidden className="size-4" />
              </span>
            </div>
            <dd
              data-testid={testId}
              className={`font-display text-3xl font-bold tracking-tight tabular-nums ${tone}`}
            >
              {formatBRL(cents)}
            </dd>
          </div>
        ))}
      </dl>

      <CategoryOverview rows={summary.rows} />

      <BudgetCharts rows={summary.rows} spentCents={summary.spentCents} pace={pace} />

      <ContentCard
        title="Transações do mês"
        note={`${shown.length} lançamentos`}
        action={<NewTransactionButton variant="header" categories={activeCategories} defaultDate={todayInSaoPaulo()} />}
        bodyClassName="space-y-4"
      >
        <div className="px-6">
          <TransactionFilter categories={categories} filter={filter} search={search} />
        </div>
        <TransactionList
          transactions={shown}
          categories={activeCategories}
          filtered={filter.categoryId !== null}
          searching={search !== ""}
        />
      </ContentCard>

      <NewTransactionButton categories={activeCategories} defaultDate={todayInSaoPaulo()} />
    </div>
  );
}
