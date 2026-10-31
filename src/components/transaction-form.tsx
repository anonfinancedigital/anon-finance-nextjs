"use client";

import Link from "next/link";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId, useRef, useState, useTransition } from "react";
import { createTransactionSealed, updateTransactionSealed } from "@/actions/transactions-sealed";
import { KindToggle } from "@/components/kind-toggle";
import { MonthField } from "@/components/month-field";
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
import { previousDay, todayInSaoPaulo } from "@/lib/domain/day";
import { maskBRLInput, parseBRL } from "@/lib/domain/money";
import { lastDayOfMonth } from "@/lib/domain/recurrence";
import {
  endForInstallments,
  formatMonthLabel,
  installmentCount,
  parseMonthKey,
  recurrenceSummary,
} from "@/lib/domain/recurrence-plan";
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
  /** Shows "Excluir" in the footer (edit only). */
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

const choiceClass =
  "cursor-pointer text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

/**
 * Creates (id generated on mount, so a double submit creates one row) or edits a transaction.
 * "Salvar" does not reset: the parent closes the dialog, which unmounts it. "Salvar e adicionar outra"
 * (create only) keeps it open and starts the next one with the same kind, date and category.
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
  const amountRef = useRef<HTMLInputElement>(null);
  // "Outra data" was chosen: the date field stays open even if the date happens to be today or yesterday.
  const [otherDate, setOtherDate] = useState(false);
  // A save-and-add-another just happened; the note goes away once the next one starts being typed.
  const [savedOne, setSavedOne] = useState(false);

  const today = todayInSaoPaulo();
  const yesterday = previousDay(today);
  const dateChoice = otherDate ? "other" : values.date === today ? "today" : values.date === yesterday ? "yesterday" : "other";

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const selectedCategory = categories.find((c) => c.id === values.categoryId);
  const recurrenceMode = values.recurrence ?? "none";
  const startKey = values.recurrenceStart ?? "";
  const endKey = values.recurrenceEnd ?? "";
  const installments = installmentCount(startKey, endKey);
  const parsedAmount = parseBRL(values.amount);
  const summary =
    recurrenceMode === "until"
      ? recurrenceSummary({
          start: startKey,
          end: endKey,
          amountCents: parsedAmount.ok ? parsedAmount.value : null,
        })
      : null;
  // Editing a recurring transaction changes this occurrence and the following ones, and its date must stay
  // inside the occurrence's own month (the server refuses otherwise).
  const editedMonth = transaction ? (month ?? transaction.date.slice(0, 7)) : null;
  const wasRecurring = !!transaction && (transaction.recurrence ?? "none") !== "none";
  const lockedMonth = wasRecurring ? editedMonth : null;
  const needsCategories = values.kind === "expense" && categories.length === 0;

  function set<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function pickDate(choice: string) {
    if (choice === "other") {
      setOtherDate(true);
      return;
    }
    setOtherDate(false);
    set("date", choice === "today" ? today : yesterday);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save(false);
  }

  /** Clears what changes between two transactions and keeps kind, date and category. */
  function startNext() {
    setValues((v) => ({
      ...blank(v.date),
      kind: v.kind,
      categoryId: v.kind === "expense" ? v.categoryId : "",
    }));
    setResult(null);
    setSavedOne(true);
    setTimeout(() => amountRef.current?.focus(), 0);
  }

  function save(addAnother: boolean) {
    if (pending) return;
    setSavedOne(false);
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
      if (res.ok) {
        if (addAnother) startNext();
        else onSaved?.();
      }
    });
  }

  const field = (name: string) => `${uid}-${name}`;

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
      aria-label={transaction ? "Editar transação" : "Nova transação"}
    >
      <div className="scroll-shadows -mx-1 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-1 pb-1 sm:space-y-3">
        <KindToggle
          value={values.kind}
          onChange={(kind) => set("kind", kind)}
        />

        <div className="space-y-1">
          <Label htmlFor={field("amount")}>Valor (R$)</Label>
          <Input
            id={field("amount")}
            ref={amountRef}
            inputMode="numeric"
            autoFocus
            placeholder="0,00"
            value={values.amount}
            aria-invalid={!!fieldErrors.amount}
            onChange={(e) => set("amount", maskBRLInput(e.target.value))}
            className={cn(
              "h-12 text-center font-display text-2xl tabular-nums sm:h-14 sm:text-3xl md:text-3xl",
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

        {lockedMonth ? (
          <div className="space-y-1">
            <Label htmlFor={field("date")}>Data</Label>
            <Input
              id={field("date")}
              type="date"
              min={`${lockedMonth}-01`}
              max={`${lockedMonth}-${String(lastDayOfMonth(lockedMonth)).padStart(2, "0")}`}
              value={values.date}
              aria-invalid={!!fieldErrors.date}
              onChange={(e) => set("date", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Dentro de {formatMonthLabel(lockedMonth)}, o mês desta ocorrência.</p>
            {fieldErrors.date && <p className="text-sm text-destructive">{fieldErrors.date}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <Label id={field("date-label")} htmlFor={dateChoice === "other" || fieldErrors.date ? field("date") : undefined}>
              Data
            </Label>
            <RadioGroup
              aria-labelledby={field("date-label")}
              value={dateChoice}
              onValueChange={pickDate}
              className="grid-cols-3 gap-1 rounded-xl border border-input bg-field p-1"
            >
              {(
                [
                  ["today", "Hoje"],
                  ["yesterday", "Ontem"],
                  ["other", "Outra data"],
                ] as const
              ).map(([choice, label]) => (
                <RadioGroupPrimitive.Item
                  key={choice}
                  value={choice}
                  className={cn(
                    choiceClass,
                    "h-9 rounded-lg text-muted-foreground data-[state=checked]:bg-primary/15 data-[state=checked]:text-foreground",
                  )}
                >
                  {label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroup>
            {(dateChoice === "other" || fieldErrors.date) && (
              <Input
                id={field("date")}
                type="date"
                value={values.date}
                aria-invalid={!!fieldErrors.date}
                onChange={(e) => set("date", e.target.value)}
              />
            )}
            {fieldErrors.date && (
              <p className="text-sm text-destructive">{fieldErrors.date}</p>
            )}
          </div>
        )}

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
        {wasRecurring && editedMonth && (
          <p className="text-xs text-muted-foreground">
            As alterações valem a partir de {formatMonthLabel(editedMonth)}, incluindo os meses seguintes.
          </p>
        )}

        {recurrenceMode !== "none" && (
          <div className="space-y-3 rounded-xl border border-input bg-field/40 p-3">
            <RadioGroup
              aria-label="Frequência"
              className="gap-0 sm:gap-2"
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
                  ["forever", "Todo mês, sem data final", "Ex.: aluguel, assinatura"],
                  ["until", "Todo mês, até um mês/ano", "Ex.: parcelado em 12x"],
                ] as const
              ).map(([option, label, example]) => (
                // The whole row is the target below sm: the circle alone is only 16px.
                <div key={option} className="flex min-h-10 items-center gap-2 sm:min-h-0">
                  <RadioGroupItem
                    id={field(`recurrence-${option}`)}
                    value={option}
                  />
                  <Label
                    htmlFor={field(`recurrence-${option}`)}
                    className="min-h-10 flex-1 cursor-pointer flex-col items-start justify-center gap-0.5 font-normal sm:min-h-0"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{example}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {recurrenceMode === "until" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor={field("recurrenceStart")}>Mês inicial</Label>
                  <MonthField
                    id={field("recurrenceStart")}
                    label="Mês inicial"
                    value={startKey}
                    disabled={startLocked}
                    invalid={!!fieldErrors.recurrenceStartMonth}
                    onChange={(next) => set("recurrenceStart", next)}
                  />
                  {fieldErrors.recurrenceStartMonth && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.recurrenceStartMonth}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor={field("recurrenceEnd")}>Mês final</Label>
                  <MonthField
                    id={field("recurrenceEnd")}
                    label="Mês final"
                    value={endKey}
                    invalid={!!fieldErrors.recurrenceEndMonth}
                    onChange={(next) => set("recurrenceEnd", next)}
                  />
                  {fieldErrors.recurrenceEndMonth && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.recurrenceEndMonth}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-sm font-medium">Repetir por</span>
                  <div className="flex flex-wrap gap-2">
                    {[3, 6, 12, 24].map((count) => (
                      <Button
                        key={count}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!parseMonthKey(startKey)}
                        aria-pressed={installments === count}
                        onClick={() => set("recurrenceEnd", endForInstallments(startKey, count) ?? "")}
                        className="aria-pressed:border-primary aria-pressed:bg-primary/15"
                      >
                        {count} meses
                      </Button>
                    ))}
                  </div>
                </div>

                {summary && (
                  <p aria-live="polite" className="text-xs text-muted-foreground">
                    {summary}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-input pt-2 sm:pt-3">
        {result && !result.ok && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}

        {savedOne && values.amount === "" && values.description === "" && (
          <p role="status" className="text-sm text-success">
            ✓ Transação salva. Registre a próxima.
          </p>
        )}

        {/* One row at every width: the secondary action takes the free space, the primary one stays on the right. */}
        <div className="flex gap-2 sm:justify-end">
          {onDelete && (
            // Outlined, not filled: deleting must be findable but not compete with "Salvar alterações".
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onDelete}
              aria-label="Excluir transação"
              className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto sm:flex-none"
            >
              Excluir
            </Button>
          )}
          {onCancel && (
            // Below sm the "✕" of the dialog already closes it, and the height is scarce.
            <Button type="button" variant="outline" onClick={onCancel} className="hidden sm:inline-flex">
              Cancelar
            </Button>
          )}
          {!transaction && (
            <Button
              type="button"
              variant="outline"
              disabled={pending || needsCategories}
              onClick={() => save(true)}
              className="h-9 flex-1 sm:h-10 sm:flex-none"
            >
              Salvar e adicionar outra
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending || needsCategories}
            className={transaction ? "flex-1 sm:flex-none" : "px-6 sm:flex-none"}
          >
            {transaction ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
