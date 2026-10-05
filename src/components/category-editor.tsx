"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategories } from "@/actions/categories";
import { AdjustSumBar } from "@/components/adjust-sum-bar";
import { CategorySquare } from "@/components/category-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputAffix } from "@/components/input-affix";
import { Input } from "@/components/ui/input";
import { ReferenceIncomeCard } from "@/components/reference-income-card";
import { SubcategoryEditor, type SubcategoryRow } from "@/components/subcategory-editor";
import type { ActionResult } from "@/lib/action-result";
import { allocateCents, type Category } from "@/lib/domain/budget";
import { categoryDisplayName } from "@/lib/domain/category-label";
import { CATEGORY_COLORS, colorVar, nextFreeColor } from "@/lib/domain/color";
import { formatBRL, parseBRL } from "@/lib/domain/money";
import {
  adjustToTotal,
  formatPercent,
  microFromCents,
  parsePercent,
  percentFieldText,
  sumLabel,
  TOTAL_MICRO,
} from "@/lib/domain/percent";

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

/** Column widths shared by the header row and the category rows so they line up. */
const COL_PERCENT = "w-28";
const COL_AMOUNT = "w-36";
/** Same width as the subcategory toggle in `CategoryCard` (w-32). */
const COL_COUNT = "w-32";
/** The trash button is `size-8`, the same width. */
const COL_ACTION = "w-8";

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
  name,
  groupName,
  value,
  errorId,
  onChange,
}: {
  label: string;
  /** Category name, for the initial shown in the square. */
  name: string;
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
        className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategorySquare name={name} color={value} />
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
 * A reference income (starts from `initialIncome`; local state only, never saved) previews each category's amount in R$.
 */
export function CategoryEditor({
  categories,
  initialIncome = "",
}: {
  categories: Category[];
  /** Starting text of the reference income, e.g. the month income. */
  initialIncome?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => categories.map(toRow));
  const [result, setResult] = useState<ActionResult | null>(null);
  // Kept apart from the rows so it survives the reset after a save.
  const [income, setIncome] = useState(initialIncome);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  // Row whose percent field has focus: it shows the full text, the others show 2 decimals.
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  // Row waiting for the removal confirmation dialog.
  const [removing, setRemoving] = useState<number | null>(null);
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
  const removingRow = removing === null ? null : rows[removing];
  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setResult(null);
    setAdjustError(null);
  }

  /** Makes this row absorb the difference so the sum becomes exactly 100%. */
  function adjust(index: number) {
    const current = parsed[index];
    const next = adjustToTotal(current?.ok ? current.value : 0, sumMicro);
    if (!next.ok) {
      setAdjustError(next.error);
      return;
    }
    update(index, { percent: percentText(next.value), amountText: undefined });
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
    setAdjustError(null);
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
    setAdjustError(null);
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
      <ReferenceIncomeCard value={income} onChange={setIncome} />

      <div className="divide-y divide-border rounded-2xl border border-border bg-card px-4 shadow-lg">
        <div
          aria-hidden
          className="hidden items-center gap-x-3 py-2 text-xs font-medium tracking-wide text-muted-foreground sm:flex"
        >
          <span className="w-9 shrink-0" />
          <span className="min-w-40 flex-1">CATEGORIA</span>
          <span className={COL_PERCENT}>% DO TOTAL</span>
          <span className={COL_AMOUNT}>VALOR ESTIMADO</span>
          <span className={COL_COUNT}>SUBCATEGORIAS</span>
          <span className={`${COL_ACTION} shrink-0 whitespace-nowrap`}>AÇÕES</span>
        </div>
        {rows.map((row, i) => {
          const nameError = fieldErrors[`${i}.name`];
          const colorError = fieldErrors[`${i}.color`];
          const live = parsed[i];
          const typed = row.amountText !== undefined && incomeCents !== null ? parseBRL(row.amountText) : null;
          const typedMicro = typed?.ok && incomeCents !== null ? microFromCents(typed.value, incomeCents) : typed;
          const amountError = typedMicro && !typedMicro.ok ? typedMicro.error : undefined;
          const percentError = fieldErrors[`${i}.percent`] ?? (live && !live.ok ? live.error : undefined);
          return (
            <div key={row.key} className="group/row py-2">
              <SubcategoryEditor
                index={i}
                name={row.name}
                color={row.color}
                items={row.subcategories}
                errors={fieldErrors}
                onChange={(subcategories) => update(i, { subcategories })}
                controls={
                  <>
                    <div>
                      <ColorPicker
                        label={`Cor da categoria ${i + 1}`}
                        name={row.name}
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
                    </div>
                    <div className="min-w-40 flex-1">
                      <Input
                        aria-label={`Nome da categoria ${i + 1}`}
                        value={row.name}
                        maxLength={60}
                        aria-invalid={!!nameError}
                        onChange={(e) => update(i, { name: e.target.value })}
                      />
                      {nameError && <p className="mt-1 text-sm text-destructive">{nameError}</p>}
                    </div>
                    <div className={COL_PERCENT}>
                      <InputAffix suffix="%">
                        <Input
                          aria-label={`Percentual da categoria ${i + 1}`}
                          inputMode="decimal"
                          value={percentFieldText(row.percent, focusedRow === i)}
                          aria-invalid={!!percentError}
                          onFocus={() => setFocusedRow(i)}
                          onBlur={() => setFocusedRow((current) => (current === i ? null : current))}
                          onChange={(e) => update(i, { percent: e.target.value, amountText: undefined })}
                        />
                      </InputAffix>
                      {percentError && <p className="mt-1 text-sm text-destructive">{percentError}</p>}
                    </div>
                    <div className={COL_AMOUNT}>
                      <InputAffix prefix="R$">
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
                      </InputAffix>
                      {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
                    </div>
                  </>
                }
                trailing={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover categoria ${i + 1}`}
                      onClick={() => (row.subcategories.length > 0 ? setRemoving(i) : remove(i))}
                      className={`size-8 opacity-40 group-hover/row:text-destructive group-hover/row:opacity-100 group-focus-within/row:text-destructive group-focus-within/row:opacity-100`}
                    >
                      <Trash2Icon aria-hidden className="size-4" />
                    </Button>
                  </>
                }
              />
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-end gap-x-6 py-2 text-sm font-medium">
          <span>Soma</span>
          <span data-testid="category-sum">{sumLabel(sumMicro)}</span>
          <span data-testid="category-amount-sum">
            {incomeCents === null ? "—" : formatBRL(amountSum)}
          </span>
        </div>
      </div>

      {!sumOk && (
        <AdjustSumBar
          sumMicro={sumMicro}
          incomeCents={incomeCents}
          options={rows.map((r, i) => ({
            index: i,
            label: r.name.trim() || `Categoria ${i + 1}`,
            micro: parsed[i]?.ok ? parsed[i].value : null,
          }))}
          onApply={adjust}
          error={adjustError}
        />
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
        <Button
          type="submit"
          disabled={!sumOk || pending}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40"
        >
          Salvar
        </Button>
      </div>
      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover categoria?</DialogTitle>
            <DialogDescription>
              {removingRow &&
                `"${categoryDisplayName(removingRow.name)}" e ${
                  removingRow.subcategories.length === 1
                    ? "sua 1 subcategoria"
                    : `suas ${removingRow.subcategories.length} subcategorias`
                } serão removidas ao salvar.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (removing !== null) remove(removing);
                setRemoving(null);
              }}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
