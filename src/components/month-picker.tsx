"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { YearMonth } from "@/lib/domain/month";

const param = ({ year, month }: YearMonth) => `${year}-${String(month).padStart(2, "0")}`;

const shift = ({ year, month }: YearMonth, delta: number): YearMonth => {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Previous/next and direct selection of the displayed month, kept in `?mes=AAAA-MM`. */
export function MonthPicker({ month }: { month: YearMonth }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only `mes` changes; filters and any other parameter stay in the URL.
  const href = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("mes", value);
    return `/?${next.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={href(param(shift(month, -1)))} aria-label="Mês anterior">
          ‹
        </Link>
      </Button>
      <span data-testid="month-label" className="min-w-36 text-center font-medium first-letter:uppercase">
        {monthName.format(new Date(Date.UTC(month.year, month.month - 1, 1)))}
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link href={href(param(shift(month, 1)))} aria-label="Próximo mês">
          ›
        </Link>
      </Button>
      <input
        type="month"
        aria-label="Mês"
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        value={param(month)}
        onChange={(e) => {
          if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(href(e.target.value));
        }}
      />
    </div>
  );
}
