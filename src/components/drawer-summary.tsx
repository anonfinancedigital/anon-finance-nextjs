import { ArrowDown, ArrowUp } from "lucide-react";
import type { GoalSummary } from "@/lib/domain/freedom";
import {
  DEPOSIT_LABEL,
  depositDelta,
  depositText,
  TARGET_LABEL,
} from "@/lib/domain/freedom-copy";
import { formatCompactBRL } from "@/lib/domain/money";

/**
 * Fixed summary on top of the drawer: the monthly deposit in the largest type, the needed patrimony
 * smaller beside it, the change against the saved deposit and the "Prévia" label while the values
 * differ from the saved ones. The changed number flashes for 300 ms (re-fired by `key`; the
 * animation is off under `prefers-reduced-motion`).
 */
export function DrawerSummary({
  summary,
  savedSummary,
  dirty,
}: {
  summary: GoalSummary | null;
  savedSummary: GoalSummary | null;
  dirty: boolean;
}) {
  const deposit = summary ? depositText(summary) : "—";
  const target = summary ? formatCompactBRL(summary.targetCents) : "—";
  const delta =
    summary && savedSummary
      ? depositDelta(summary.monthlyCents, savedSummary.monthlyCents)
      : null;

  return (
    <section
      aria-label="Resumo da prévia"
      className="sticky top-0 z-10 space-y-2 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{DEPOSIT_LABEL}</p>
        {dirty && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-link">
            Prévia
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p
          key={deposit}
          className="animate-flash rounded-md font-display text-3xl font-bold tracking-tight"
        >
          {deposit}
        </p>
        <div className="text-sm text-muted-foreground">
          <span>{TARGET_LABEL}: </span>
          <span
            key={target}
            className="animate-flash rounded-sm font-display font-bold text-foreground"
          >
            {target}
          </span>
        </div>
      </div>
      {delta && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          {delta.direction === "up" ? (
            <ArrowUp aria-hidden className="size-4" />
          ) : (
            <ArrowDown aria-hidden className="size-4" />
          )}
          {delta.text}
        </p>
      )}
    </section>
  );
}
