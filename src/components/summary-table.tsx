"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
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
import type { SummarySort, SummarySortKey } from "@/lib/domain/summary-sort";

const columns: { key: SummarySortKey; label: string; className?: string }[] = [
  { key: "percent", label: "Percentual" },
  { key: "target", label: "Meta" },
  { key: "spent", label: "Gasto" },
  { key: "remaining", label: "Restante" },
  { key: "consumption", label: "Consumo", className: "w-48" },
];

/**
 * One category as a card, for screens below sm where the table would scroll sideways: name and consumption,
 * spent of target, the bar, and what is left (or by how much it went over).
 */
function SummaryCard({
  row,
  open,
  detailed,
  onToggle,
}: {
  row: CategorySummary;
  open: boolean;
  detailed: boolean;
  onToggle: () => void;
}) {
  const noTarget = row.hasPercent === false;
  return (
    <li
      data-testid="summary-card"
      data-overspent={row.overspent}
      className={`space-y-2 px-6 py-3.5 ${row.overspent ? "bg-destructive/5" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-2 shrink-0 rounded-full"
          style={{ background: colorVar(row.color) }}
        />
        <span className="min-w-0 truncate font-medium">{row.name}</span>
        {detailed && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-expanded={open}
            aria-controls={`summary-card-detail-${row.id}`}
            aria-label={`Detalhar ${row.name} por subcategoria`}
            onClick={onToggle}
            className="text-muted-foreground"
          >
            {open ? "▾" : "▸"}
          </Button>
        )}
        <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
          {noTarget ? "Sem meta" : `${row.consumedPct}%`}
        </span>
      </div>
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{formatBRL(row.spentCents)}</span>
        {!noTarget && <span className="text-muted-foreground"> de {formatBRL(row.targetCents)}</span>}
      </p>
      {!noTarget && (
        <Progress
          value={Math.min(row.consumedPct, 100)}
          aria-label={`Consumo da meta de ${row.name}`}
          className="h-1.5"
          indicatorClassName={row.overspent ? "bg-destructive" : "bg-income"}
        />
      )}
      {row.overspent && (
        <p className="text-xs font-semibold text-destructive">Estourou {formatBRL(row.overspentCents)}</p>
      )}
      {row.exceeded && (
        <p className="text-xs font-semibold text-income">Excedeu a meta em {formatBRL(row.exceededCents)}</p>
      )}
      {!noTarget && !row.overspent && !row.exceeded && (
        <p className="text-xs text-muted-foreground tabular-nums">Restam {formatBRL(row.remainingCents)}</p>
      )}
      {open && (
        <ul id={`summary-card-detail-${row.id}`} className="space-y-1 border-l border-border pl-3">
          {row.breakdown.map((line) => (
            <li
              key={line.subcategoryId ?? "none"}
              data-testid="summary-card-subrow"
              className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground tabular-nums"
            >
              <span className="min-w-0 truncate">{line.name}</span>
              <span className="shrink-0">
                {formatBRL(line.spentCents)} · {formatShare(line.shareBp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Column title that sorts on click; the arrow shows the active direction and appears faintly on hover otherwise. */
function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align,
  className,
}: {
  label: string;
  sortKey: SummarySortKey;
  sort: SummarySort;
  onSort: (key: SummarySortKey) => void;
  align: "left" | "right";
  className?: string;
}) {
  const active = sort?.key === sortKey ? sort.direction : null;
  const Icon = active === "asc" ? ArrowUpIcon : active === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <TableHead
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}
      className={`${align === "right" ? "text-right" : ""} ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        <Icon
          aria-hidden
          className={`size-3.5 shrink-0 ${active ? "" : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50"}`}
        />
      </button>
    </TableHead>
  );
}

/**
 * Per category: percentage, target, spent, remaining and how much of the target was used. `hideCta` drops the
 * empty-state button when another card already points to the same step. With `onSort`, the titles sort the
 * rows (already ordered by the parent) on click.
 */
export function SummaryTable({
  rows,
  hideCta = false,
  sort = null,
  onSort,
}: {
  rows: CategorySummary[];
  hideCta?: boolean;
  sort?: SummarySort;
  onSort?: (key: SummarySortKey) => void;
}) {
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
    <>
      <ul data-testid="summary-cards" className="divide-y divide-border border-t border-border sm:hidden">
        {rows.map((row) => {
          const detailed = row.breakdown.some((line) => line.subcategoryId !== null);
          return (
            <SummaryCard
              key={row.id}
              row={row}
              detailed={detailed}
              open={detailed && expanded.has(row.id)}
              onToggle={() => toggle(row.id)}
            />
          );
        })}
      </ul>
      <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            {onSort ? (
              <SortHeader label="Categoria" sortKey="name" sort={sort} onSort={onSort} align="left" className="px-6" />
            ) : (
              <TableHead className="px-6">Categoria</TableHead>
            )}
            {columns.map((column) =>
              onSort ? (
                <SortHeader
                  key={column.key}
                  label={column.label}
                  sortKey={column.key}
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  className={column.className}
                />
              ) : (
                <TableHead key={column.key} className={`text-right ${column.className ?? ""}`}>
                  {column.label}
                </TableHead>
              ),
            )}
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
                className={`text-right tabular-nums ${
                  row.hasPercent === false ? "text-muted-foreground" : row.overspent ? "text-destructive" : "text-income"
                }`}
              >
                {row.hasPercent === false ? "—" : formatRemaining(row)}
              </TableCell>
              <TableCell className="pr-6">
                {row.hasPercent === false ? (
                  <p className="text-right text-muted-foreground">—</p>
                ) : (
                <div className="flex items-center justify-end gap-2">
                  <Progress
                    value={Math.min(row.consumedPct, 100)}
                    aria-label={`Consumo da meta de ${row.name}`}
                    className="h-1.5 w-24"
                    indicatorClassName={row.overspent ? "bg-destructive" : "bg-income"}
                  />
                  <span className="w-10 text-right text-xs font-semibold tabular-nums">{row.consumedPct}%</span>
                </div>
                )}
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
      </div>
    </>
  );
}
