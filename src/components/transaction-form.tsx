"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { createTransactionSealed, updateTransactionSealed } from "@/actions/transactions-sealed";
import { KindToggle } from "@/components/kind-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useVault } from "@/components/vault-provider";
import { type ActionResult, invalidInput } from "@/lib/action-result";
import {
  categoryDisplayName,
  pickSelection,
} from "@/lib/domain/category-label";
import { maskBRLInput } from "@/lib/domain/money";
import { transactionSchema } from "@/lib/validation/transaction";
import { sealTransaction } from "@/lib/vault/seal";
import type { TransactionDto } from "@/lib/vault/types";
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
  /** AAAA-MM first month of the series; read only when `recurrence` is "until". */
  recurrenceStart?: string;
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
  /** Shows the start month disabled: it only changes when editing the series' first month. */
  startLocked?: boolean;
  onSaved?: () => void;
  /** Shows "Cancelar" in the footer. */
  onCancel?: () => void;
  /** Shows "Excluir lançamento" in the footer (edit only). */
  onDelete?: () => void;
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
  recurrenceStart: "",
});

/** The browser validates with the plain-text field names; errors use the sealed DTO's names. */
const sealedFieldName: Record<string, string> = {
  recurrenceStart: "recurrenceStartMonth",
  recurrenceEnd: "recurrenceEndMonth",
};

function clientInvalidInput(result: ActionResult): ActionResult {
  if (result.ok || !result.fieldErrors) return result;
  const fieldErrors = Object.fromEntries(
    Object.entries(result.fieldErrors).map(([key, message]) => [sealedFieldName[key] ?? key, message]),
  );
  return { ...result, fieldErrors };
}

/**
 * Creates (id generated on mount, so a double submit creates one row) or edits a transaction.
 * It does not reset after saving: the parent closes the dialog, which unmounts it.
 * Validates in the browser with the current rules, then seals amount and description before sending:
 * an invalid value sends nothing (SIGILO-09) and no plain amount or description reaches the action.
 */
export function TransactionForm({
  categories,
  defaultDate,
  transaction,
  month,
  startLocked,
  onSaved,
  onCancel,
  onDelete,
}: Props) {
  const uid = useId();
  const { dek, userId } = useVault();
  const [values, setValues] = useState<TransactionFormValues>(
    () => transaction ?? blank(defaultDate),
  );
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const selectedCategory = categories.find((c) => c.id === values.categoryId);
  const recurrenceMode = values.recurrence ?? "none";
  const needsCategories = values.kind === "expense" && categories.length === 0;

  function set<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const { id, kind, amount, date, description } = values;
    // What the selects show is what is sent: an id missing from the list counts as unselected.
    const categoryId = selectedCategory ? values.categoryId : "";
    const subcategoryId = selectedCategory?.subcategories.some(
      (s) => s.id === values.subcategoryId,
    )
      ? values.subcategoryId
      : "";
    const recurrence = {
      recurrence: values.recurrence ?? "none",
      recurrenceStart: values.recurrenceStart ?? "",
      recurrenceEnd: values.recurrenceEnd ?? "",
    };
    const input =
      kind === "expense"
        ? {
            id,
            kind,
            amount,
            date,
            categoryId,
            subcategoryId,
            description,
            ...recurrence,
          }
        : { id, kind, amount, date, description, ...recurrence };

    // Same rules and messages as before, now checked before sealing: nothing is sent when invalid.
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      setResult(clientInvalidInput(invalidInput(parsed.error)));
      return;
    }
    const data = parsed.data;

    startTransition(async () => {
      const plain = { amountCents: data.amountCents, description: data.description };
      const dto: TransactionDto = {
        id: data.id,
        kind: data.kind,
        date: data.date,
        categoryId: data.kind === "expense" ? data.categoryId : null,
        subcategoryId: data.kind === "expense" ? (data.subcategoryId ?? null) : null,
        ...(await sealTransaction(dek, userId, data.id, plain)),
        recurrence: data.recurrence === "forever" ? "indefinite" : data.recurrence,
        ...(data.recurrence === "until"
          ? {
              recurrenceStartMonth: data.recurrenceStartMonth ?? undefined,
              recurrenceEndMonth: data.recurrenceEndMonth ?? undefined,
            }
          : {}),
      };
      let res: ActionResult;
      if (transaction) {
        // An edit may split a series: the new segment gets its own id, so its ciphertext has its own AAD.
        const newRowId = crypto.randomUUID();
        const insertedCt = await sealTransaction(dek, userId, newRowId, plain);
        res = await updateTransactionSealed({ ...dto, newRowId, insertedCt }, month);
      } else {
        res = await createTransactionSealed(dto);
      }
      setResult(res);
      if (res.ok) onSaved?.();
    });
  }

  const field = (name: string) => `${uid}-${name}`;

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
      aria-label={transaction ? "Editar Lançamento" : "Registrar Lançamento"}
    >
      <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-1">
        <KindToggle
          value={values.kind}
          onChange={(kind) => set("kind", kind)}
        />

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
          {fieldErrors.amount && (
            <p className="text-sm text-destructive">{fieldErrors.amount}</p>
          )}
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
            <p className="text-sm text-destructive">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {values.kind === "expense" && (
          <div className="space-y-1">
            {needsCategories ? (
              <p className="text-sm">
                <Link
                  href="/categorias"
                  className="font-medium underline underline-offset-4"
                >
                  Crie sua primeira categoria
                </Link>
              </p>
            ) : (
              <>
                <Label htmlFor={field("category")}>Categoria</Label>
                <SelectField
                  id={field("category")}
                  value={selectedCategory ? values.categoryId : ""}
                  invalid={!!fieldErrors.categoryId}
                  onValueChange={(v) =>
                    setValues((prev) => ({ ...prev, ...pickSelection(v) }))
                  }
                  placeholder="Selecione uma categoria"
                  options={[
                    { value: "", label: "Selecione uma categoria" },
                    ...categories.map((c) => ({ value: c.id, label: categoryDisplayName(c.name) })),
                  ]}
                />
                {fieldErrors.categoryId && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.categoryId}
                  </p>
                )}
                {selectedCategory &&
                  selectedCategory.subcategories.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <Label htmlFor={field("subcategory")}>Subcategoria</Label>
                      <SelectField
                        id={field("subcategory")}
                        value={
                          selectedCategory.subcategories.some(
                            (s) => s.id === values.subcategoryId,
                          )
                            ? values.subcategoryId
                            : ""
                        }
                        invalid={!!fieldErrors.subcategoryId}
                        onValueChange={(v) => set("subcategoryId", v)}
                        options={[
                          { value: "", label: "Sem subcategoria" },
                          ...selectedCategory.subcategories.map((s) => ({
                            value: s.id,
                            label: categoryDisplayName(s.name),
                          })),
                        ]}
                      />
                    </div>
                  )}
                {fieldErrors.subcategoryId && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.subcategoryId}
                  </p>
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
          {fieldErrors.date && (
            <p className="text-sm text-destructive">{fieldErrors.date}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={field("recurring")}>Transação recorrente</Label>
          <Switch
            id={field("recurring")}
            checked={recurrenceMode !== "none"}
            onCheckedChange={(on) =>
              setValues((v) => ({
                ...v,
                recurrence: on ? "forever" : "none",
                recurrenceEnd: "",
              }))
            }
          />
        </div>

        {recurrenceMode !== "none" && (
          <RadioGroup
            aria-label="Frequência"
            value={recurrenceMode}
            onValueChange={(next) =>
              setValues((v) => ({
                ...v,
                recurrence: next as Recurrence,
                // The start month begins as the month of the date.
                recurrenceStart: v.recurrenceStart || v.date.slice(0, 7),
              }))
            }
          >
            {(
              [
                ["forever", "Todo mês, sem data final"],
                ["until", "Todo mês, até um mês/ano"],
              ] as const
            ).map(([option, label]) => (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem
                  id={field(`recurrence-${option}`)}
                  value={option}
                />
                <Label
                  htmlFor={field(`recurrence-${option}`)}
                  className="font-normal"
                >
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {recurrenceMode === "until" && (
          <div className="space-y-1">
            <Label htmlFor={field("recurrenceStart")}>Mês inicial</Label>
            <Input
              id={field("recurrenceStart")}
              type="month"
              value={values.recurrenceStart ?? ""}
              disabled={startLocked}
              aria-invalid={!!fieldErrors.recurrenceStartMonth}
              onChange={(e) => set("recurrenceStart", e.target.value)}
            />
            {fieldErrors.recurrenceStartMonth && (
              <p className="text-sm text-destructive">
                {fieldErrors.recurrenceStartMonth}
              </p>
            )}
          </div>
        )}

        {recurrenceMode === "until" && (
          <div className="space-y-1">
            <Label htmlFor={field("recurrenceEnd")}>Mês final</Label>
            <Input
              id={field("recurrenceEnd")}
              type="month"
              value={values.recurrenceEnd ?? ""}
              aria-invalid={!!fieldErrors.recurrenceEndMonth}
              onChange={(e) => set("recurrenceEnd", e.target.value)}
            />
            {fieldErrors.recurrenceEndMonth && (
              <p className="text-sm text-destructive">
                {fieldErrors.recurrenceEndMonth}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-input pt-3">
        {result && !result.ok && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onDelete}
              className="sm:mr-auto"
            >
              Excluir lançamento
            </Button>
          )}
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending || needsCategories}
            className="w-full sm:w-auto"
          >
            {transaction ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
