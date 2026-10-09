"use client";

import { useMemo, useState } from "react";
import { CategoryEditor } from "@/components/category-editor";
import { LOAD_ERROR_MESSAGE, useOpened } from "@/components/use-opened";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { referenceIncomeText } from "@/lib/domain/money";
import type { YearMonth } from "@/lib/domain/month";
import { computeMonthTotals } from "@/lib/vault/month-totals";
import { openMonth } from "@/lib/vault/open";
import type { MonthPayload } from "@/lib/vault/types";

type Opened = Awaited<ReturnType<typeof openMonth>>;

/**
 * Opens the current month's sealed categories and occurrences and renders the allocation editor.
 * The reference income is the month income computed in the browser (SIGILO-07); any field that
 * fails to open shows the fixed load error and nothing else (SIGILO-06).
 */
export function CategoriesClient({
  payload,
  month,
  nowIso,
}: {
  /** Sealed rows of the current month. */
  payload: MonthPayload;
  month: YearMonth;
  nowIso: string;
}) {
  const { data, error } = useOpened(
    (dek, userId) => openMonth(dek, userId, payload, month, new Date(nowIso)),
    [payload, month.year, month.month, nowIso],
  );

  // A refresh after a save sends a new payload: keep the editor (and its "saved" message) on screen
  // with the last opened set until the new one is open.
  const [last, setLast] = useState<Opened | null>(null);
  if (data && data !== last) setLast(data);

  // Stable reference: the editor resets its rows whenever `categories` changes identity.
  const opened = data ?? last;
  const editor = useMemo(
    () =>
      opened && {
        categories: opened.categories.filter((c) => !c.deleted),
        initialIncome: referenceIncomeText(computeMonthTotals(opened.occurrences).incomeCents),
      },
    [opened],
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{LOAD_ERROR_MESSAGE}</AlertDescription>
      </Alert>
    );
  }
  if (!editor) {
    return <div aria-busy="true" aria-label="Carregando" className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }
  return <CategoryEditor categories={editor.categories} initialIncome={editor.initialIncome} />;
}
