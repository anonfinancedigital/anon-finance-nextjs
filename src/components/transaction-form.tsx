"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";

type Kind = "income" | "expense";

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
};

type Props = {
  categories: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  /** Date preselected when creating (today in America/Sao_Paulo). */
  defaultDate: string;
  /** When given, the form edits this transaction instead of creating one. */
  transaction?: TransactionFormValues;
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
});

// SPEC_DEVIATION: native <select> and radio inputs instead of the shadcn/Radix Select.
// Reason: same behavior with less code, native keyboard/mobile pickers and simpler e2e selectors.
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30 aria-invalid:border-destructive";

/**
 * Creates (id generated on mount, so a double submit creates one row) or edits a transaction.
 * It does not reset after saving: the parent closes the dialog, which unmounts it.
 */
export function TransactionForm({ categories, defaultDate, transaction, onSaved }: Props) {
  const uid = useId();
  const [values, setValues] = useState<TransactionFormValues>(
    () => transaction ?? blank(defaultDate),
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const subcategories = categories.find((c) => c.id === values.categoryId)?.subcategories ?? [];
  const needsCategories = values.kind === "expense" && categories.length === 0;

  function set<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const { id, kind, amount, date, categoryId, subcategoryId, description } = values;
    const input =
      kind === "expense"
        ? { id, kind, amount, date, categoryId, subcategoryId, description }
        : { id, kind, amount, date, description };

    startTransition(async () => {
      const res = await (transaction ? updateTransaction(input) : createTransaction(input));
      setResult(res);
      if (res.ok) onSaved?.();
    });
  }

  const field = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={transaction ? "Editar transação" : "Nova transação"}>
      <fieldset className="flex gap-4">
        <legend className="mb-1 text-sm font-medium">Tipo</legend>
        {(
          [
            ["expense", "Gasto"],
            ["income", "Ganho"],
          ] as const
        ).map(([kind, label]) => (
          <label key={kind} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={field("kind")}
              value={kind}
              checked={values.kind === kind}
              onChange={() => set("kind", kind)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={field("amount")}>Valor (R$)</Label>
          <Input
            id={field("amount")}
            inputMode="decimal"
            placeholder="1.234,56"
            value={values.amount}
            aria-invalid={!!fieldErrors.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
          {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
        </div>
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
              <Label htmlFor={field("category")}>Categoria</Label>
              <select
                id={field("category")}
                className={selectClass}
                value={values.categoryId}
                aria-invalid={!!fieldErrors.categoryId}
                onChange={(e) =>
                  setValues((v) => ({ ...v, categoryId: e.target.value, subcategoryId: "" }))
                }
              >
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>
              )}
              <Label htmlFor={field("subcategory")}>Subcategoria</Label>
              <select
                id={field("subcategory")}
                className={selectClass}
                value={values.subcategoryId}
                disabled={subcategories.length === 0}
                aria-invalid={!!fieldErrors.subcategoryId}
                onChange={(e) => set("subcategoryId", e.target.value)}
              >
                <option value="">Sem subcategoria</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.subcategoryId && (
                <p className="text-sm text-destructive">{fieldErrors.subcategoryId}</p>
              )}
            </>
          )}
        </div>
      )}

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
