"use client";

import { BudgetCharts } from "@/components/budget-charts";
import { CategoryOverview } from "@/components/category-overview";
import { ContentCard } from "@/components/content-card";
import { GettingStartedCard } from "@/components/getting-started-card";
import { MonthPicker } from "@/components/month-picker";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { PageHeader } from "@/components/page-header";
import { SummaryCards } from "@/components/summary-cards";
import { TransactionFilter } from "@/components/transaction-filter";
import { TransactionList } from "@/components/transaction-list";
import { LOAD_ERROR_MESSAGE, useOpened } from "@/components/use-opened";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildMonthlySummary } from "@/lib/domain/budget";
import { todayInSaoPaulo } from "@/lib/domain/day";
import { currentMonth, monthHref, type YearMonth } from "@/lib/domain/month";
import { deriveMonthState, deriveSetup, monthLongName, previousMonth } from "@/lib/domain/onboarding";
import { buildSpendingPaceViews } from "@/lib/domain/spending-pace";
import {
  filterTransactions,
  parseSearch,
  parseTransactionFilter,
  searchTransactions,
} from "@/lib/domain/transaction-filter";
import { computeMonthTotals } from "@/lib/vault/month-totals";
import { openMonth } from "@/lib/vault/open";
import type { MonthPayload } from "@/lib/vault/types";

type Props = {
  /** Sealed rows of `month`. */
  payload: MonthPayload;
  /**
   * Sealed categories of the current month, for the forms; `null` when `payload.categories` already
   * holds them (the month asked is not before the current one).
   */
  activeCategories: MonthPayload["categories"] | null;
  month: YearMonth;
  /** The server's "now", so the percents resolve against the same current month. */
  nowIso: string;
  /** `categoria`, `subcategoria` and `busca` of the URL, as strings. */
  params: { categoria?: string; subcategoria?: string; busca?: string };
  /** The URL's string search params, in order, for links that keep them. */
  currentParams: [string, string][];
  hasGoal: boolean;
};

/** "Visão Geral" in the browser: opens the month's sealed rows, then runs the same domain rules as before. */
export function OverviewClient({ payload, activeCategories, month, nowIso, params, currentParams, hasGoal }: Props) {
  const opened = useOpened(
    async (dek, userId) => {
      const now = new Date(nowIso);
      const [monthData, current] = await Promise.all([
        openMonth(dek, userId, payload, month, now),
        activeCategories &&
          openMonth(dek, userId, { categories: activeCategories, occurrences: [], totalTransactions: 0 }, currentMonth(now), now),
      ]);
      return { ...monthData, currentCategories: current ? current.categories : monthData.categories };
    },
    [payload, activeCategories, month.year, month.month, nowIso],
    // A refresh after saving keeps the page (and its scroll) while the new rows open; another month does not.
    [month.year, month.month],
  );

  return (
    <div className="space-y-6 pb-32">
      <PageHeader title="Visão Geral">
        <MonthPicker month={month} />
      </PageHeader>

      {opened.error ? (
        <Alert variant="destructive">
          <AlertDescription>{LOAD_ERROR_MESSAGE}</AlertDescription>
        </Alert>
      ) : opened.data === null ? (
        <OverviewSkeleton />
      ) : (
        <OverviewBody
          {...opened.data}
          month={month}
          params={params}
          currentParams={currentParams}
          totalTransactions={payload.totalTransactions}
          hasGoal={hasGoal}
        />
      )}
    </div>
  );
}

type BodyProps = Pick<Props, "month" | "params" | "currentParams" | "hasGoal"> &
  Awaited<ReturnType<typeof openMonth>> & {
    currentCategories: Awaited<ReturnType<typeof openMonth>>["categories"];
    totalTransactions: number;
  };

/** Jump links to the long page's sections, below md only; the sections carry a matching `id`. */
const SECTIONS = [
  { id: "resumo", label: "Resumo" },
  { id: "categorias", label: "Categorias" },
  { id: "transacoes", label: "Transações" },
] as const;

/** The former body of `(app)/page.tsx`, over the opened rows. */
function OverviewBody({
  categories,
  occurrences: transactions,
  currentCategories,
  month,
  params,
  currentParams,
  totalTransactions,
  hasGoal,
}: BodyProps) {
  // Forms only accept active categories: one deleted after `month` still shows in the summary.
  const activeCategories = currentCategories.filter((c) => !c.deleted);
  const totals = computeMonthTotals(transactions);
  const summary = buildMonthlySummary({ categories, ...totals });
  const paces = buildSpendingPaceViews({
    month,
    today: todayInSaoPaulo(),
    categories: summary.rows,
    occurrences: transactions,
  });
  // The filter only narrows the list; summary and charts keep the whole month.
  const filter = parseTransactionFilter(
    { categoria: params.categoria, subcategoria: params.subcategoria },
    categories,
  );

  const search = parseSearch(params.busca);
  const shown = searchTransactions(filterTransactions(transactions, filter), search);

  const monthIsEmpty = transactions.length === 0;
  const setup = deriveSetup({
    categories: activeCategories.length,
    transactions: totalTransactions,
    hasGoal,
  });
  const monthState = deriveMonthState({ monthTransactions: transactions.length, totalTransactions });
  const previous = previousMonth(month);
  const emphasis = setup.complete ? "primary" : "secondary";
  const showFilters = !monthIsEmpty || filter.categoryId !== null || search !== "";
  const today = todayInSaoPaulo();

  return (
    <>
      <nav aria-label="Seções da página" className="flex gap-2 md:hidden">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <GettingStartedCard setup={setup} categories={activeCategories} defaultDate={today} />

      <div id="resumo" className="scroll-mt-24">
        <SummaryCards
          incomeCents={summary.incomeCents}
          spentCents={summary.spentCents}
          balanceCents={summary.balanceCents}
          empty={monthIsEmpty}
        />
      </div>

      <div id="categorias" className="scroll-mt-24">
        <CategoryOverview rows={summary.rows} hideCta={!setup.complete} />
      </div>

      {/* Keyed by month so the "Incluir investimentos" choice resets when the month changes. */}
      <BudgetCharts
        key={`${month.year}-${month.month}`}
        rows={summary.rows}
        spentCents={summary.spentCents}
        paces={paces}
      />

      <div id="transacoes" className="scroll-mt-24">
        <ContentCard
          // Clip instead of hide: a scroll container would stop the day headings from sticking to the page.
          className="overflow-clip"
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
            // Starts the "Ver mais" count over when the filters change.
            key={`${filter.categoryId}|${filter.subcategoryId}|${search}`}
            transactions={shown}
            categories={activeCategories}
            filtered={filter.categoryId !== null}
            searching={search !== ""}
            emptyState={monthState}
            monthName={monthLongName(month)}
            previousHref={monthHref(
              new URLSearchParams(currentParams),
              `${previous.year}-${String(previous.month).padStart(2, "0")}`,
            )}
            previousMonthName={monthLongName(previous)}
            defaultDate={today}
            emphasis="secondary"
          />
        </ContentCard>
      </div>

    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
