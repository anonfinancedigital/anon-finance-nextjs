"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthHref, type YearMonth } from "@/lib/domain/month";

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
  const href = (value: string) => monthHref(searchParams, value);

  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 sm:w-auto">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={href(param(shift(month, -1)))} aria-label="Mês anterior">
          <ChevronLeftIcon aria-hidden />
        </Link>
      </Button>
      <span data-testid="month-label" className="min-w-0 flex-1 text-center text-sm font-semibold first-letter:uppercase sm:min-w-36 sm:flex-none">
        {monthName.format(new Date(Date.UTC(month.year, month.month - 1, 1)))}
      </span>
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={href(param(shift(month, 1)))} aria-label="Próximo mês">
          <ChevronRightIcon aria-hidden />
        </Link>
      </Button>
      <Input
        type="month"
        aria-label="Mês"
        className="h-8 w-40 shrink-0 rounded-lg border-0 bg-transparent text-sm"
        value={param(month)}
        onChange={(e) => {
          if (/^\d{4}-\d{2}$/.test(e.target.value)) router.push(href(e.target.value));
        }}
      />
    </div>
  );
}
