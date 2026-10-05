"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { saveCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubcategoryEditor, type SubcategoryRow } from "@/components/subcategory-editor";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";
import { allocateCents, type Category } from "@/lib/domain/budget";
import { CATEGORY_COLORS, colorVar, nextFreeColor } from "@/lib/domain/color";
import { formatBRL, parseBRL } from "@/lib/domain/money";
import { formatPercent, microFromCents, parsePercent, TOTAL_MICRO } from "@/lib/domain/percent";

type Row = {
  key: string;
  id?: string;
  name: string;
  percent: string;
  /** Text typed in the amount field; shown as is until the percent changes or the field loses focus. */
  amountText?: string;
  color: number;
  subcategories: SubcategoryRow[];
};

const percentText = (micro: number) => formatPercent(micro).replace("%", "");
const amountField = (cents: number) => formatBRL(cents).replace(/^R\$\s*/, "");

const toRow = (c: Category): Row => ({
  key: c.id,
  id: c.id,
  name: c.name,
  percent: percentText(c.percentMicro),
  color: c.color,
  subcategories: c.subcategories.map((s) => ({ key: s.id, id: s.id, name: s.name })),
});

/** Shows only the chosen color; clicking it opens a dialog with the whole palette. */
function ColorPicker({
  label,
  groupName,
  value,
  errorId,
  onChange,
}: {
  label: string;
  groupName: string;
  value: number;
  /** Id of the row's color error message, when there is one. */
  errorId?: string;
  onChange: (color: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = CATEGORY_COLORS.find((c) => c.value === value);

  return (
    <>
      <button
        type="button"
        aria-label={`${label}: ${current?.name ?? "nenhuma"}`}
        title={current?.name}
        aria-describedby={errorId}
        onClick={() => setOpen(true)}
        className="flex h-9 cursor-pointer items-center"
      >
        <span
          style={{ backgroundColor: colorVar(value) }}
          className="size-6 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Escolher cor</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-3 py-2">
            {CATEGORY_COLORS.map((c) => (
              <input
                key={c.value}
                type="radio"
                name={groupName}
                value={c.value}
                aria-label={c.name}
                title={c.name}
                checked={value === c.value}
                onChange={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
                style={{ backgroundColor: colorVar(c.value) }}
                className="size-8 cursor-pointer appearance-none rounded-full outline-none ring-offset-2 ring-offset-background checked:ring-2 checked:ring-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Editable category set with a live sum; saving is blocked until the sum is exactly 100%.
 * A reference income (local state only, never saved) previews each category's amount in R$.
 */
export function CategoryEditor({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => categories.map(toRow));
  const [result, setResult] = useState<ActionResult | null>(null);
  // Kept apart from the rows so it survives the reset after a save.
  const [income, setIncome] = useState("");
  const [pending, startTransition] = useTransition();

  // After a save the server sends the set again (with ids of new categories): start from it.
  const [shown, setShown] = useState(categories);
  if (categories !== shown) {
    setShown(categories);
    setRows(categories.map(toRow));
  }

  const parsed = rows.map((r) => (r.percent.trim() === "" ? null : parsePercent(r.percent)));
  const sumMicro = parsed.reduce((sum, p) => sum + (p?.ok ? p.value : 0), 0);
  const sumOk = sumMicro === TOTAL_MICRO;
  const parsedIncome = income.trim() === "" ? null : parseBRL(income);
  const incomeCents = parsedIncome?.ok ? parsedIncome.value : null;
  const amounts = parsed.map((p) =>
    incomeCents !== null && p?.ok ? allocateCents(incomeCents, p.value) : null,
  );
  const amountSum = amounts.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setResult(null);
  }

  function changeAmount(index: number, text: string) {
    const patch: Partial<Row> = { amountText: text };
    const cents = parseBRL(text);
    if (incomeCents !== null && cents.ok) {
      const micro = microFromCents(cents.value, incomeCents);
      if (micro.ok) patch.percent = percentText(micro.value);
    }
    update(index, patch);
  }

  function remove(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setResult(null);
  }

  function add() {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name: "",
        percent: "",
        color: nextFreeColor(current.map((r) => r.color)),
        subcategories: [],
      },
    ]);
    setResult(null);
  }

  function save() {
    startTransition(async () => {
      const res = await saveCategories(
        rows.map(({ id, name, percent, color, subcategories }) => ({
          id,
          name,
          percent,
          color,
          subcategories: subcategories.map((s) => ({ id: s.id, name: s.name })),
        })),
      );
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="max-w-xs space-y-1">
        <Label htmlFor="reference-income">Receita de referência (R$)</Label>
        <Input
          id="reference-income"
          inputMode="decimal"
          placeholder="5.000,00"
          value={income}
          aria-invalid={!!parsedIncome && !parsedIncome.ok}
          onChange={(e) => setIncome(e.target.value)}
        />
        {parsedIncome && !parsedIncome.ok && (
          <p className="text-sm text-destructive">{parsedIncome.error}</p>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead className="w-40">Percentual (%)</TableHead>
            <TableHead className="w-40">Valor (R$)</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const nameError = fieldErrors[`${i}.name`];
            const colorError = fieldErrors[`${i}.color`];
            const live = parsed[i];
            const typed = row.amountText !== undefined && incomeCents !== null ? parseBRL(row.amountText) : null;
            const typedMicro = typed?.ok && incomeCents !== null ? microFromCents(typed.value, incomeCents) : typed;
            const amountError = typedMicro && !typedMicro.ok ? typedMicro.error : undefined;
            const percentError = fieldErrors[`${i}.percent`] ?? (live && !live.ok ? live.error : undefined);
            return (
              <Fragment key={row.key}>
              <TableRow>
                <TableCell className="align-top">
                  <Input
                    aria-label={`Nome da categoria ${i + 1}`}
                    value={row.name}
                    maxLength={60}
                    aria-invalid={!!nameError}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  {nameError && <p className="mt-1 text-sm text-destructive">{nameError}</p>}
                </TableCell>
                <TableCell className="align-top">
                  <ColorPicker
                    label={`Cor da categoria ${i + 1}`}
                    groupName={`color-${row.key}`}
                    value={row.color}
                    errorId={colorError ? `color-error-${row.key}` : undefined}
                    onChange={(color) => update(i, { color })}
                  />
                  {colorError && (
                    <p id={`color-error-${row.key}`} className="mt-1 text-sm text-destructive">
                      {colorError}
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    aria-label={`Percentual da categoria ${i + 1}`}
                    inputMode="decimal"
                    value={row.percent}
                    aria-invalid={!!percentError}
                    onChange={(e) => update(i, { percent: e.target.value, amountText: undefined })}
                  />
                  {percentError && <p className="mt-1 text-sm text-destructive">{percentError}</p>}
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    aria-label={`Valor da categoria ${i + 1}`}
                    data-testid={`category-amount-${i + 1}`}
                    inputMode="decimal"
                    disabled={incomeCents === null}
                    title={incomeCents === null ? "Informe a receita de referência" : undefined}
                    value={row.amountText ?? (amounts[i] === null ? "" : amountField(amounts[i]))}
                    aria-invalid={!!amountError}
                    onChange={(e) => changeAmount(i, e.target.value)}
                    onBlur={() => update(i, { amountText: undefined })}
                  />
                  {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
                </TableCell>
                <TableCell className="align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remover categoria ${i + 1}`}
                    onClick={() => remove(i)}
                  >
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} className="pt-0">
                  <SubcategoryEditor
                    index={i}
                    name={row.name}
                    color={row.color}
                    items={row.subcategories}
                    errors={fieldErrors}
                    onChange={(subcategories) => update(i, { subcategories })}
                  />
                </TableCell>
              </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Soma</TableCell>
            <TableCell />
            <TableCell data-testid="category-sum">{formatPercent(sumMicro)}</TableCell>
            <TableCell data-testid="category-amount-sum">
              {incomeCents === null ? "—" : formatBRL(amountSum)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      {!sumOk && (
        <p className="text-sm text-destructive">
          {`A soma dos percentuais deve ser 100% (atual: ${formatPercent(sumMicro)})`}
        </p>
      )}
      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="text-sm text-muted-foreground">
          Categorias salvas
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={add}>
          Adicionar categoria
        </Button>
        <Button type="submit" disabled={!sumOk || pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
