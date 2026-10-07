"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { monthHref, monthNamesPtBR, shiftMonth, type YearMonth } from "@/lib/domain/month";

const param = ({ year, month }: YearMonth) => `${year}-${String(month).padStart(2, "0")}`;

const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Previous/next and direct selection of the displayed month, kept in `?mes=AAAA-MM`. */
export function MonthPicker({ month }: { month: YearMonth }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(month.year);
  const href = (value: string) => monthHref(searchParams, value);

  const choose = (chosen: number) => {
    setOpen(false);
    if (viewYear === month.year && chosen === month.month) return;
    router.push(href(param({ year: viewYear, month: chosen })));
  };

  return (
    <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 sm:w-auto">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={href(param(shiftMonth(month, -1)))} aria-label="Mês anterior">
          <ChevronLeftIcon aria-hidden />
        </Link>
      </Button>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setViewYear(month.year);
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="month-label"
            aria-haspopup="dialog"
            className="min-w-0 flex-1 rounded-lg px-2 py-1 text-center text-sm font-semibold first-letter:uppercase hover:bg-hover sm:min-w-36 sm:flex-none"
          >
            {monthName.format(new Date(Date.UTC(month.year, month.month - 1, 1)))}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="center">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ano anterior"
              onClick={() => setViewYear((y) => y - 1)}
            >
              <ChevronLeftIcon aria-hidden />
            </Button>
            <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Próximo ano"
              onClick={() => setViewYear((y) => y + 1)}
            >
              <ChevronRightIcon aria-hidden />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {monthNamesPtBR().map((name, index) => {
              const selected = viewYear === month.year && index + 1 === month.month;
              return (
                <Button
                  key={name}
                  variant={selected ? "default" : "ghost"}
                  size="sm"
                  onClick={() => choose(index + 1)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={href(param(shiftMonth(month, 1)))} aria-label="Próximo mês">
          <ChevronRightIcon aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
