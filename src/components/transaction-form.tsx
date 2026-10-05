"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { CategoryPicker } from "@/components/category-picker";
import { KindToggle } from "@/components/kind-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { maskBRLInput } from "@/lib/domain/money";
import { cn } from "cn";

type Kind = "income" | "expense";
type Recurrence = "none" | "forever" | "until";

export type TransactionFormValues = {
  id: string;
  kind: Kind;
  /** pt-BR text, e.g. "1.234,56". */
  amount: string;
  /** AAAA-MM-DD. */
  date: string;
  categoryId: string;
  /** "" = Sem subcategoria. */
  subcategoryId: string;
  description: string;
  /** Omitted = "none". */
  recurrence?: Recurrence;
  /** AAAA-MM; read only when `recurrence` is "until". */
  recurrenceEnd?: string;
};

type Props = {
  categories: {
    id: string;
    name: string;
    color: number;
    subcategories: { id: string; name: string }[];
  }[];
  /** Date preselected when creating (today in America/Sao_Paulo). */
  defaultDate: string;
  /** When given, the form edits this transaction instead of creating one. */
  transaction?: TransactionFormValues;
  /** AAAA-MM of the occurrence being edited; sent to `updateTransaction`. */
  month?: string;
  onSaved?: () => void;
};

const blank = (date: string): TransactionFormValues => ({
  id: crypto.randomUUID(),
  kind: "expense",
  amount: "",
  date,
  categoryId: "",
  subcategoryId: "",
  description: "",
  recurrence: "none",
  recurrenceEnd: "",
});

/**
 * Creates (id generated on mount, so a double submit creates one row) or edits a transaction.
 * It does not reset after saving: the parent closes the dialog, which unmounts it.
 */
export function TransactionForm({ categories, defaultDate, transaction, month, onSaved }: Props) {
  const uid = useId();
  const [values, setValues] = useState<TransactionFormValues>(
    () => transaction ?? blank(defaultDate),
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const needsCategories = values.kind === "expense" && categories.length === 0;

  function set<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const { id, kind, amount, date, categoryId, subcategoryId, description } = values;
    const recurrence = {
      recurrence: values.recurrence ?? "none",
      recurrenceEnd: values.recurrenceEnd ?? "",
    };
    const input =
      kind === "expense"
        ? { id, kind, amount, date, categoryId, subcategoryId, description, ...recurrence }
        : { id, kind, amount, date, description, ...recurrence };

    startTransition(async () => {
      const res = await (transaction ? updateTransaction(input, month) : createTransaction(input));
      setResult(res);
      if (res.ok) onSaved?.();
    });
  }

  const field = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={transaction ? "Editar transação" : "Nova transação"}>
      <KindToggle value={values.kind} onChange={(kind) => set("kind", kind)} />

      <div className="space-y-1">
        <Label htmlFor={field("amount")}>Valor (R$)</Label>
        <Input
          id={field("amount")}
          inputMode="numeric"
          autoFocus
          placeholder="0,00"
          value={values.amount}
          aria-invalid={!!fieldErrors.amount}
          onChange={(e) => set("amount", maskBRLInput(e.target.value))}
          className={cn(
            "h-14 font-display text-3xl md:text-3xl",
            values.kind === "income" && "text-success",
          )}
        />
        {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor={field("description")}>Descrição</Label>
        <Input
          id={field("description")}
          maxLength={120}
          value={values.description}
          aria-invalid={!!fieldErrors.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {fieldErrors.description && (
          <p className="text-sm text-destructive">{fieldErrors.description}</p>
        )}
      </div>

      {values.kind === "expense" && (
        <div className="space-y-1">
          {needsCategories ? (
            <p className="text-sm">
              <Link href="/categorias" className="font-medium underline underline-offset-4">
                Crie suas categorias primeiro
              </Link>
            </p>
          ) : (
            <>
              <Label>Categoria</Label>
              <CategoryPicker
                categories={categories}
                categoryId={values.categoryId}
                subcategoryId={values.subcategoryId}
                invalid={!!fieldErrors.categoryId || !!fieldErrors.subcategoryId}
                onChange={(selection) => setValues((v) => ({ ...v, ...selection }))}
              />
              {fieldErrors.categoryId && (
                <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>
              )}
              {fieldErrors.subcategoryId && (
                <p className="text-sm text-destructive">{fieldErrors.subcategoryId}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={field("date")}>Data</Label>
        <Input
          id={field("date")}
          type="date"
          value={values.date}
          aria-invalid={!!fieldErrors.date}
          onChange={(e) => set("date", e.target.value)}
        />
        {fieldErrors.date && <p className="text-sm text-destructive">{fieldErrors.date}</p>}
      </div>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-medium">Repetir</legend>
        {(
          [
            ["none", "Não recorrente"],
            ["forever", "Sempre"],
            ["until", "Até mês/ano"],
          ] as const
        ).map(([option, label]) => (
          <label key={option} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={field("recurrence")}
              value={option}
              checked={(values.recurrence ?? "none") === option}
              onChange={() => set("recurrence", option)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {values.recurrence === "until" && (
        <div className="space-y-1">
          <Label htmlFor={field("recurrenceEnd")}>Mês final</Label>
          <Input
            id={field("recurrenceEnd")}
            type="month"
            value={values.recurrenceEnd ?? ""}
            aria-invalid={!!fieldErrors.recurrenceEnd}
            onChange={(e) => set("recurrenceEnd", e.target.value)}
          />
          {fieldErrors.recurrenceEnd && (
            <p className="text-sm text-destructive">{fieldErrors.recurrenceEnd}</p>
          )}
        </div>
      )}

      {result && !result.ok && !Object.keys(fieldErrors).length && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <Button type="submit" disabled={pending || needsCategories}>
        Salvar
      </Button>
    </form>
  );
}
