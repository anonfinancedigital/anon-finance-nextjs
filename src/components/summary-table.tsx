import Link from "next/link";
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
import { formatBRL } from "@/lib/domain/money";
import { formatPercent } from "@/lib/domain/percent";

/** Per category: percentage, target, spent, remaining and how much of the target was used. */
export function SummaryTable({ rows }: { rows: CategorySummary[] }) {
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
        {rows.map((row) => (
          <TableRow
            key={row.id}
            data-testid="summary-row"
            data-overspent={row.overspent}
            className={row.overspent ? "bg-destructive/5" : undefined}
          >
            <TableCell className="font-medium">{row.name}</TableCell>
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
        ))}
      </TableBody>
    </Table>
  );
}
