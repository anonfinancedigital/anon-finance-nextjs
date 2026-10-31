import { ArrowDownLeftIcon, ArrowUpRightIcon, WalletIcon } from "lucide-react";
import { formatBRL } from "@/lib/domain/money";

type Props = {
  incomeCents: number;
  spentCents: number;
  balanceCents: number;
  /** Month without transactions: neutral colors and a short caption instead of the colored zeros. */
  empty: boolean;
};

const NEUTRAL = { tone: "text-foreground", iconTone: "bg-muted text-muted-foreground" };

/** Receita, Gasto and Saldo of the displayed month. Below sm: Saldo on top, Receita and Gasto side by side. */
export function SummaryCards({ incomeCents, spentCents, balanceCents, empty }: Props) {
  const cards = [
    {
      label: "Receita",
      testId: "total-income",
      cents: incomeCents,
      icon: ArrowDownLeftIcon,
      caption: "Registre receitas para ver aqui",
      tone: "text-income",
      iconTone: "bg-income/15 text-income",
    },
    {
      label: "Gasto",
      testId: "total-spent",
      cents: spentCents,
      icon: ArrowUpRightIcon,
      caption: "Registre gastos para ver aqui",
      tone: "text-destructive",
      iconTone: "bg-destructive/15 text-destructive",
    },
    {
      label: "Saldo",
      testId: "total-balance",
      cents: balanceCents,
      icon: WalletIcon,
      caption: "Receitas menos gastos do mês",
      tone: balanceCents < 0 ? "text-destructive" : "text-link",
      iconTone: "bg-primary/15 text-link",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map(({ label, testId, cents, icon: Icon, caption, tone, iconTone }) => {
        const colors = empty ? NEUTRAL : { tone, iconTone };
        return (
          <div
            key={testId}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-6 ${
              testId === "total-balance" ? "order-first col-span-2 sm:order-none sm:col-span-1" : ""
            }`}
          >
            <div className="flex items-center justify-between pb-2 sm:pb-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <span className={`flex size-9 items-center justify-center rounded-xl ${colors.iconTone}`}>
                <Icon aria-hidden className="size-4" />
              </span>
            </div>
            <dd
              data-testid={testId}
              className={`font-display font-bold tracking-tight tabular-nums sm:text-3xl ${
                testId === "total-balance" ? "text-3xl" : "text-xl"
              } ${colors.tone}`}
            >
              {formatBRL(cents)}
            </dd>
            {empty && <dd className="pt-1 text-xs text-muted-foreground">{caption}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
