"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategorySummary } from "@/lib/domain/budget";
import { colorVar } from "@/lib/domain/color";
import { formatBRL } from "@/lib/domain/money";
import { formatPercent, formatShare } from "@/lib/domain/percent";

/** Per category: percentage, target, spent, remaining and how much of the target was used. */
export function SummaryTable({ rows }: { rows: CategorySummary[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm">
        <Link href="/categorias" className="font-medium underline underline-offset-4">
          Crie suas categorias primeiro
        </Link>
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          <TableHead className="text-right">Percentual</TableHead>
          <TableHead className="text-right">Meta</TableHead>
          <TableHead className="text-right">Gasto</TableHead>
          <TableHead className="text-right">Restante</TableHead>
          <TableHead className="w-48">Consumo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const detailed = row.breakdown.some((line) => line.subcategoryId !== null);
          const open = detailed && expanded.has(row.id);
          return (
          <Fragment key={row.id}>
          <TableRow
            data-testid="summary-row"
            data-overspent={row.overspent}
            className={row.overspent ? "bg-destructive/5" : undefined}
          >
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2.5 shrink-0 rounded-sm"
                  style={{ background: colorVar(row.color) }}
                />
                {row.name}
                {detailed && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`summary-detail-${row.id}`}
                    aria-label={`Detalhar ${row.name} por subcategoria`}
                    onClick={() => toggle(row.id)}
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    {open ? "▾" : "▸"}
                  </button>
                )}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(row.percentBp)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatBRL(row.targetCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatBRL(row.spentCents)}</TableCell>
            <TableCell
              className={`text-right tabular-nums ${row.overspent ? "text-destructive" : ""}`}
            >
              {formatBRL(row.remainingCents)}
            </TableCell>
            <TableCell>
              {row.overspent ? (
                <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  Estourou {formatBRL(row.overspentCents)}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Progress
                    value={row.consumedPct}
                    aria-label={`Consumo da meta de ${row.name}`}
                    className="h-2"
                  />
                  <span className="w-10 text-right text-xs tabular-nums">{row.consumedPct}%</span>
                </div>
              )}
            </TableCell>
          </TableRow>
          {open &&
            row.breakdown.map((line, k) => (
              <TableRow
                key={line.subcategoryId ?? "none"}
                id={k === 0 ? `summary-detail-${row.id}` : undefined}
                data-testid="summary-subrow"
                className="text-muted-foreground"
              >
                <TableCell className="pl-9">{line.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatShare(line.shareBp)}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{formatBRL(line.spentCents)}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            ))}
          </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
