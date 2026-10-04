import type { Transaction } from "@/lib/db/repos/transactions";
import { formatBRL } from "@/lib/domain/money";

type Props = {
  transactions: Transaction[];
  categories: { id: string; name: string }[];
};

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

/** The selected month's transactions, in the order received (latest date first). */
export function TransactionList({ transactions, categories }: Props) {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <ul data-testid="transaction-list" className="divide-y rounded-lg border">
      {transactions.map((t) => (
        <li key={t.id} data-testid="transaction-row" className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className="w-20 tabular-nums text-muted-foreground">{formatDate(t.date)}</span>
          <span className="flex-1">
            {t.description ?? (t.kind === "income" ? "Ganho" : "Gasto")}
            {t.categoryId && (
              <span className="ml-2 text-muted-foreground">{categoryName.get(t.categoryId)}</span>
            )}
          </span>
          <span className="tabular-nums font-medium">
            {t.kind === "income" ? "+" : "−"} {formatBRL(t.amountCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}
