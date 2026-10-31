"use client";

import { usePathname, useRouter } from "next/navigation";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { useOpened } from "@/components/use-opened";
import { todayInSaoPaulo } from "@/lib/domain/day";
import { currentMonth } from "@/lib/domain/month";
import { openMonth } from "@/lib/vault/open";
import type { MonthPayload } from "@/lib/vault/types";

/**
 * The "Nova transação" button over the middle of the bottom bar, on every page of the app. It lives in the
 * layout, inside the vault, so it opens the current month's sealed categories itself and the form can seal
 * the new transaction with the same key. It shows once the categories are open.
 */
export function GlobalNewTransaction({
  categories,
  nowIso,
}: {
  /** Sealed categories of the current month. */
  categories: MonthPayload["categories"];
  nowIso: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const opened = useOpened(
    async (dek, userId) => {
      const now = new Date(nowIso);
      const { categories: open } = await openMonth(
        dek,
        userId,
        { categories, occurrences: [], totalTransactions: 0 },
        currentMonth(now),
        now,
      );
      // The form only takes active categories.
      return open.filter((c) => !c.deleted);
    },
    [categories, nowIso],
    // Keep the button while a refreshed set opens.
    [],
  );

  if (opened.data === null) return null;
  return (
    <NewTransactionButton
      categories={opened.data}
      defaultDate={todayInSaoPaulo()}
      // The overview refreshes itself when a transaction is saved; the other pages need a nudge.
      onSaved={() => {
        if (pathname !== "/") router.refresh();
      }}
    />
  );
}
