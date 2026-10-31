"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionRowMenu } from "@/components/transaction-row-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Occurrence } from "@/lib/db/repos/transactions";
import { colorVar } from "@/lib/domain/color";
import { formatDayHeading } from "@/lib/domain/day-heading";
import { netByDay } from "@/lib/domain/day-total";
import type { MonthState } from "@/lib/domain/onboarding";
import { formatBRL } from "@/lib/domain/money";
import { monthKey } from "@/lib/domain/recurrence";

type Props = {
  transactions: Occurrence[];
  categories: {
    id: string;
    name: string;
    color: number;
    subcategories: { id: string; name: string }[];
  }[];
  /** A filter is active: an empty list means no match, not an empty month. */
  filtered?: boolean;
  /** A description search is active. */
  searching?: boolean;
  /** Distinguishes first access from an empty month when there is no filter or search. */
  emptyState?: MonthState;
  /** Lowercase month name for the empty-month title, e.g. `outubro`. */
  monthName?: string;
  /** Link to the month before the displayed one. */
  previousHref?: string;
  /** Name of the month before the displayed one, for the `Ver {mês}` link. */
  previousMonthName?: string;
  /** Date preselected in the new-transaction dialog. */
  defaultDate?: string;
  /** Emphasis of the empty-month "Nova transação" button. */
  emphasis?: "primary" | "secondary";
};

/** Rows shown at first, and added by each "Ver mais". */
const PAGE_SIZE = 25;

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

/** Cents as the pt-BR text the form accepts, e.g. 123456 → "1.234,56". */
const amountText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

/**
 * The selected month's transactions, in the order received (latest date first). Below sm each day gets a
 * heading (sticky, with the day's net) instead of a date on every row; a long month shows `PAGE_SIZE` rows
 * and grows on "Ver mais".
 * The parent keys it by month and filters, so the count starts over when they change.
 */
export function TransactionList({
  transactions,
  categories,
  filtered = false,
  searching = false,
  emptyState = "has-data",
  monthName,
  previousHref,
  previousMonthName,
  defaultDate,
  emphasis = "primary",
}: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const dayNet = netByDay(transactions);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [deleting, setDeleting] = useState<Occurrence | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [limit, setLimit] = useState(PAGE_SIZE);

  if (transactions.length === 0 && !filtered && !searching && emptyState === "first-access") {
    return (
      <p className="px-6 pb-6 text-sm text-muted-foreground">Todas as receitas e gastos do mês aparecem aqui.</p>
    );
  }

  if (transactions.length === 0 && !filtered && !searching && emptyState === "empty-month") {
    return (
      <div className="space-y-4 px-6 pb-6">
        <p className="text-sm text-muted-foreground">Nenhuma transação em {monthName}</p>
        <div className="flex flex-wrap gap-2">
          {defaultDate && (
            <NewTransactionButton
              variant="inline"
              emphasis={emphasis}
              categories={categories}
              defaultDate={defaultDate}
              label="Nova transação"
            />
          )}
          {previousHref && (
            <Button asChild variant="outline">
              <Link href={previousHref}>Ver {previousMonthName}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="px-6 pb-6 text-sm text-muted-foreground">
        {searching
          ? "Nenhuma transação encontrada para esta busca"
          : filtered
            ? "Nenhum gasto encontrado para este filtro"
            : "Nenhuma transação neste mês"}
      </p>
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    const { id, month } = deleting;
    startTransition(async () => {
      const res = await deleteTransaction(id, month);
      if (res.ok) {
        setDeleting(null);
        setEditing(null);
      }
      else setDeleteError(res.error);
    });
  }

  return (
    <>
      <ul data-testid="transaction-list" className="divide-y divide-border border-t border-border">
        {transactions.slice(0, limit).map((t, index, shown) => {
          const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
          const subcategory = category?.subcategories.find((s) => s.id === t.subcategoryId);
          const newDay = index === 0 || shown[index - 1].date !== t.date;
          return (
            <Fragment key={t.id}>
              {newDay && (
                <li
                  role="presentation"
                  className="sticky top-[65px] z-10 flex items-baseline justify-between gap-3 bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground sm:hidden"
                >
                  <span>{formatDayHeading(t.date)}</span>
                  <span className={`tabular-nums ${(dayNet.get(t.date) ?? 0) > 0 ? "text-income" : ""}`}>
                    {(dayNet.get(t.date) ?? 0) > 0 ? "+ " : (dayNet.get(t.date) ?? 0) < 0 ? "− " : ""}
                    {formatBRL(Math.abs(dayNet.get(t.date) ?? 0))}
                  </span>
                </li>
              )}
              <li
                data-testid="transaction-row"
                className="flex items-center gap-x-3 px-4 py-3 text-sm transition-colors active:bg-hover sm:gap-x-4 sm:px-6 sm:py-3.5"
              >
                <span
                  aria-hidden
                  className={`hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex ${
                    t.kind === "income" ? "bg-income/15 text-income" : "bg-subtle text-muted-foreground"
                  }`}
                >
                  {t.kind === "income" ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
                </span>
                {/* The whole text block opens the editor: a large target on a phone, and reachable by keyboard. */}
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="min-w-0 flex-1 cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    <span className="line-clamp-2 break-words sm:line-clamp-none">
                      {t.description ?? (t.kind === "income" ? "Ganho" : "Gasto")}
                    </span>
                    {t.installment ? (
                      <span
                        data-testid="installment-badge"
                        className="rounded-md bg-subtle px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground tabular-nums"
                      >
                        {t.installment.number}/{t.installment.total}
                      </span>
                    ) : (
                      t.recurring && (
                        <span
                          data-testid="recurring-badge"
                          className="rounded-md bg-subtle px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          Recorrente
                        </span>
                      )
                    )}
                  </span>
                  <span
                    className={`items-center gap-1.5 text-xs text-muted-foreground sm:flex sm:flex-wrap ${
                      category || t.kind === "income" ? "flex" : "hidden"
                    }`}
                  >
                    {/* The day heading carries the date below sm. */}
                    <span className="sr-only tabular-nums sm:not-sr-only">{formatDate(t.date)}</span>
                    {category ? (
                      <>
                        <span aria-hidden className="hidden sm:inline">·</span>
                        <span
                          aria-hidden
                          className="inline-block size-1.5 shrink-0 rounded-full"
                          style={{ background: colorVar(category.color) }}
                        />
                        <span className="min-w-0 truncate sm:overflow-visible">
                          {subcategory ? `${category.name} › ${subcategory.name}` : category.name}
                        </span>
                      </>
                    ) : (
                      t.kind === "income" && (
                        <>
                          <span aria-hidden className="hidden sm:inline">·</span>
                          <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-income" />
                          Receita
                        </>
                      )
                    )}
                  </span>
                </button>
                <span
                  className={`font-display font-bold tabular-nums ${t.kind === "income" ? "text-income" : "text-foreground"}`}
                >
                  {t.kind === "income" ? "+" : "−"} {formatBRL(t.amountCents)}
                </span>
                <TransactionRowMenu
                  onEdit={() => setEditing(t)}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleting(t);
                  }}
                />
              </li>
            </Fragment>
          );
        })}
      </ul>
      {transactions.length > limit && (
        <div className="border-t border-border p-4 text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
            Ver mais ({transactions.length - limit} restantes)
          </Button>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 p-4 sm:max-w-md sm:gap-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransactionForm
              categories={categories}
              defaultDate={editing.date}
              month={editing.month}
              startLocked={editing.seriesStart !== null && editing.seriesStart !== editing.month}
              transaction={{
                id: editing.id,
                kind: editing.kind,
                amount: amountText(editing.amountCents),
                date: editing.date,
                categoryId: editing.categoryId ?? "",
                subcategoryId: editing.subcategoryId ?? "",
                description: editing.description ?? "",
                recurrence: !editing.recurring
                  ? "none"
                  : editing.recurrenceEnd === null
                    ? "forever"
                    : "until",
                recurrenceStart: editing.seriesStart ?? monthKey(editing.date),
                recurrenceEnd: editing.recurrenceEnd ? monthKey(editing.recurrenceEnd) : "",
              }}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
              onDelete={() => {
                setDeleteError(null);
                setDeleting(editing);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {deleting?.recurring
                ? "Excluir esta e as próximas ocorrências?"
                : "Excluir transação?"}
            </DialogTitle>
            <DialogDescription>
              {deleting &&
                `${deleting.description ?? (deleting.kind === "income" ? "Ganho" : "Gasto")} de ${formatBRL(deleting.amountCents)} em ${formatDate(deleting.date)}. Esta ação não pode ser desfeita.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" disabled={pending} onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
