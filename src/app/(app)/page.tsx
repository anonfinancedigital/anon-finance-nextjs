import { MonthPicker } from "@/components/month-picker";
import { SummaryTable } from "@/components/summary-table";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { formatBRL } from "@/lib/domain/money";
import { monthRange, parseMonth } from "@/lib/domain/month";

/** Today as AAAA-MM-DD in America/Sao_Paulo. */
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const { userId } = await requireSessionForPage();
  const { mes } = await searchParams;
  const month = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const range = monthRange(month);

  const [categories, transactions, totals] = await Promise.all([
    categoriesRepo.list(userId),
    transactionsRepo.listByMonth(userId, range),
    transactionsRepo.monthTotals(userId, range),
  ]);
  const summary = buildMonthlySummary({ categories, ...totals });

  const cards = [
    { label: "Receita", testId: "total-income", cents: summary.incomeCents },
    { label: "Gasto", testId: "total-spent", cents: summary.spentCents },
    { label: "Saldo", testId: "total-balance", cents: summary.balanceCents },
  ];

  return (
    <div className="space-y-8">
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
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Nova transação</h2>
          <TransactionForm categories={categories} defaultDate={todayInSaoPaulo()} />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Transações do mês</h2>
          <TransactionList transactions={transactions} categories={categories} />
        </section>
      </div>
    </div>
  );
}
