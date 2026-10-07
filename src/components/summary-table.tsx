"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRemaining, type CategorySummary } from "@/lib/domain/budget";
import { colorVar } from "@/lib/domain/color";
import { formatBRL } from "@/lib/domain/money";
import { formatPercentCompact, formatShare } from "@/lib/domain/percent";

/** Per category: percentage, target, spent, remaining and how much of the target was used. `hideCta` drops the empty-state button when another card already points to the same step. */
export function SummaryTable({ rows, hideCta = false }: { rows: CategorySummary[]; hideCta?: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    if (hideCta) return null;
    return (
      <div className="px-6 pb-6">
        <Button asChild variant="outline">
          <Link href="/categorias">Crie sua primeira categoria</Link>
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-6">Categoria</TableHead>
          <TableHead className="text-right">Percentual</TableHead>
          <TableHead className="text-right">Meta</TableHead>
          <TableHead className="text-right">Gasto</TableHead>
          <TableHead className="text-right">Restante</TableHead>
          <TableHead className="w-48 text-right">Consumo</TableHead>
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
            <TableCell className="px-6 font-medium">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ background: colorVar(row.color) }}
                />
                {row.name}
                {detailed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-expanded={open}
                    aria-controls={`summary-detail-${row.id}`}
                    aria-label={`Detalhar ${row.name} por subcategoria`}
                    onClick={() => toggle(row.id)}
                    className="text-muted-foreground"
                  >
                    {open ? "▾" : "▸"}
                  </Button>
                )}
              </span>
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">{row.hasPercent === false ? "—" : formatPercentCompact(row.percentMicro)}</TableCell>
            <TableCell className={`text-right tabular-nums ${row.hasPercent === false ? "text-muted-foreground" : ""}`}>
              {row.hasPercent === false ? "Sem meta" : formatBRL(row.targetCents)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatBRL(row.spentCents)}</TableCell>
            <TableCell
              className={`text-right tabular-nums ${row.overspent ? "text-destructive" : "text-income"}`}
            >
              {formatRemaining(row)}
            </TableCell>
            <TableCell className="pr-6">
              <div className="flex items-center justify-end gap-2">
                <Progress
                  value={Math.min(row.consumedPct, 100)}
                  aria-label={`Consumo da meta de ${row.name}`}
                  className="h-1.5 w-24"
                  indicatorClassName={row.overspent ? "bg-destructive" : "bg-income"}
                />
                <span className="w-10 text-right text-xs font-semibold tabular-nums">{row.consumedPct}%</span>
              </div>
              {row.overspent && (
                <p className="mt-1 text-right text-[11px] font-semibold text-destructive">
                  Estourou {formatBRL(row.overspentCents)}
                </p>
              )}
              {row.exceeded && (
                <p className="mt-1 text-right text-[11px] font-semibold text-income">
                  Excedeu a meta em {formatBRL(row.exceededCents)}
                </p>
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
                <TableCell className="pl-12">{line.name}</TableCell>
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
