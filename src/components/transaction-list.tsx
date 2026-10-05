"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteTransaction } from "@/actions/transactions";
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
};

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

/** Cents as the pt-BR text the form accepts, e.g. 123456 → "1.234,56". */
const amountText = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

/** The selected month's transactions, in the order received (latest date first). */
export function TransactionList({ transactions, categories, filtered = false, searching = false }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [deleting, setDeleting] = useState<Occurrence | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        {transactions.map((t) => {
          const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
          const subcategory = category?.subcategories.find((s) => s.id === t.subcategoryId);
          return (
            <li
              key={t.id}
              data-testid="transaction-row"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 text-sm"
            >
              <span
                aria-hidden
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  t.kind === "income" ? "bg-income/15 text-income" : "bg-subtle text-muted-foreground"
                }`}
              >
                {t.kind === "income" ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {t.description ?? (t.kind === "income" ? "Ganho" : "Gasto")}
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
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">{formatDate(t.date)}</span>
                  {category ? (
                    <>
                      <span aria-hidden>·</span>
                      <span
                        aria-hidden
                        className="inline-block size-1.5 shrink-0 rounded-full"
                        style={{ background: colorVar(category.color) }}
                      />
                      {subcategory ? `${category.name} › ${subcategory.name}` : category.name}
                    </>
                  ) : (
                    t.kind === "income" && (
                      <>
                        <span aria-hidden>·</span>
                        <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-income" />
                        Receita
                      </>
                    )
                  )}
                </span>
              </span>
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
          );
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
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
