"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { allocateCents, type Category, TOTAL_BP } from "@/lib/domain/budget";
import { formatBRL, parseBRL } from "@/lib/domain/money";
import { formatPercent, parsePercent } from "@/lib/domain/percent";

type Row = { key: string; id?: string; name: string; percent: string };

const toRow = (c: Category): Row => ({
  key: c.id,
  id: c.id,
  name: c.name,
  percent: formatPercent(c.percentBp).replace("%", ""),
});

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
  const sumBp = parsed.reduce((sum, p) => sum + (p?.ok ? p.value : 0), 0);
  const sumOk = sumBp === TOTAL_BP;
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

  function remove(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setResult(null);
  }

  function add() {
    setRows((current) => [...current, { key: crypto.randomUUID(), name: "", percent: "" }]);
    setResult(null);
  }

  function save() {
    startTransition(async () => {
      const res = await saveCategories(rows.map(({ id, name, percent }) => ({ id, name, percent })));
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
            const live = parsed[i];
            const percentError = fieldErrors[`${i}.percent`] ?? (live && !live.ok ? live.error : undefined);
            return (
              <TableRow key={row.key}>
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
                  <Input
                    aria-label={`Percentual da categoria ${i + 1}`}
                    inputMode="decimal"
                    value={row.percent}
                    aria-invalid={!!percentError}
                    onChange={(e) => update(i, { percent: e.target.value })}
                  />
                  {percentError && <p className="mt-1 text-sm text-destructive">{percentError}</p>}
                </TableCell>
                <TableCell className="py-4 align-top" data-testid={`category-amount-${i + 1}`}>
                  {amounts[i] === null ? "—" : formatBRL(amounts[i])}
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
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Soma</TableCell>
            <TableCell data-testid="category-sum">{formatPercent(sumBp)}</TableCell>
            <TableCell data-testid="category-amount-sum">
              {incomeCents === null ? "—" : formatBRL(amountSum)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      {!sumOk && (
        <p className="text-sm text-destructive">
          {`A soma dos percentuais deve ser 100% (atual: ${formatPercent(sumBp)})`}
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
