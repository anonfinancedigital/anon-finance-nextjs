import { BudgetCharts } from "@/components/budget-charts";
import { MonthPicker } from "@/components/month-picker";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { SummaryTable } from "@/components/summary-table";
import { TransactionFilter } from "@/components/transaction-filter";
import { TransactionList } from "@/components/transaction-list";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { formatBRL } from "@/lib/domain/money";
import { monthRange, parseMonth } from "@/lib/domain/month";
import {
  filterTransactions,
  parseSearch,
  parseTransactionFilter,
  searchTransactions,
} from "@/lib/domain/transaction-filter";

/** Today as AAAA-MM-DD in America/Sao_Paulo. */
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const { userId } = await requireSessionForPage();
  const { mes, categoria, subcategoria, busca } = await searchParams;
  const month = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const range = monthRange(month);

  const [categories, transactions, totals] = await Promise.all([
    categoriesRepo.list(userId),
    transactionsRepo.listByMonth(userId, range),
    transactionsRepo.monthTotals(userId, range),
  ]);
  const summary = buildMonthlySummary({ categories, ...totals });
  // The filter only narrows the list; summary and charts keep the whole month.
  const filter = parseTransactionFilter(
    {
      categoria: typeof categoria === "string" ? categoria : undefined,
      subcategoria: typeof subcategoria === "string" ? subcategoria : undefined,
    },
    categories,
  );

  const search = parseSearch(typeof busca === "string" ? busca : undefined);

  const cards = [
    { label: "Receita", testId: "total-income", cents: summary.incomeCents },
    { label: "Gasto", testId: "total-spent", cents: summary.spentCents },
    { label: "Saldo", testId: "total-balance", cents: summary.balanceCents },
  ];

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Resumo</h1>
        <MonthPicker month={month} />
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.testId} className="rounded-lg border p-4">
            <dt className="text-sm text-muted-foreground">{card.label}</dt>
            <dd
              data-testid={card.testId}
              className={`text-2xl font-semibold tabular-nums ${card.cents < 0 ? "text-destructive" : ""}`}
            >
              {formatBRL(card.cents)}
            </dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Gastos por categoria</h2>
        <SummaryTable rows={summary.rows} />
        <BudgetCharts rows={summary.rows} spentCents={summary.spentCents} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Transações do mês</h2>
        <TransactionFilter categories={categories} filter={filter} search={search} />
        <TransactionList
          transactions={searchTransactions(filterTransactions(transactions, filter), search)}
          categories={categories}
          filtered={filter.categoryId !== null}
          searching={search !== ""}
        />
      </section>

      <NewTransactionButton categories={categories} defaultDate={todayInSaoPaulo()} />
    </div>
  );
}
