import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { monthRange, parseMonth } from "@/lib/domain/month";

/** Today as AAAA-MM-DD in America/Sao_Paulo. */
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const { userId } = await requireSessionForPage();
  const { mes } = await searchParams;
  const month = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const range = monthRange(month);

  const [categories, transactions] = await Promise.all([
    categoriesRepo.list(userId),
    transactionsRepo.listByMonth(userId, range),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Resumo</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nova transação</h2>
        <TransactionForm categories={categories} defaultDate={todayInSaoPaulo()} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Transações do mês</h2>
        <TransactionList transactions={transactions} categories={categories} />
      </section>
    </div>
  );
}
