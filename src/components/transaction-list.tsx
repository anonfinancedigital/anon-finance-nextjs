"use client";

import { useState, useTransition } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/transaction-form";
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
      <p className="text-sm text-muted-foreground">
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
      if (res.ok) setDeleting(null);
      else setDeleteError(res.error);
    });
  }

  return (
    <>
      <ul data-testid="transaction-list" className="divide-y rounded-lg border">
        {transactions.map((t) => {
          const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
          const subcategory = category?.subcategories.find((s) => s.id === t.subcategoryId);
          return (
            <li
              key={t.id}
              data-testid="transaction-row"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="w-20 tabular-nums text-muted-foreground">{formatDate(t.date)}</span>
              <span className="min-w-0 flex-1">
                {t.description ?? (t.kind === "income" ? "Ganho" : "Gasto")}
                {t.recurring && (
                  <span
                    data-testid="recurring-badge"
                    className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    Recorrente
                  </span>
                )}
                {category && (
                  <span className="ml-2 inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-sm"
                      style={{ background: colorVar(category.color) }}
                    />
                    {subcategory ? `${category.name} › ${subcategory.name}` : category.name}
                  </span>
                )}
              </span>
              <span className="tabular-nums font-medium">
                {t.kind === "income" ? "+" : "−"} {formatBRL(t.amountCents)}
              </span>
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(t);
                  }}
                >
                  Excluir
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransactionForm
              categories={categories}
              defaultDate={editing.date}
              month={editing.month}
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
                recurrenceEnd: editing.recurrenceEnd ? monthKey(editing.recurrenceEnd) : "",
              }}
              onSaved={() => setEditing(null)}
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
