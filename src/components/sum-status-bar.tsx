"use client";

import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { adjustToTotal, formatPercent, TOTAL_MICRO } from "@/lib/domain/percent";
import { sumGap } from "@/lib/domain/sum-warning";

export type AdjustOption = {
  /** Stable key of the category row. */
  key: string;
  label: string;
  /** Valid percentage of the row in micro-percent, or null. */
  micro: number | null;
};

/**
 * Fixed bar of the allocation editor: says where the sum stands, offers to close the gap in one category
 * (with the before and after of that category) and holds "Descartar" and "Salvar". It says why "Salvar"
 * is blocked in text, since a disabled button has no hover on touch screens.
 */
export function SumStatusBar({
  sumMicro,
  incomeCents,
  hasRows,
  dirty,
  showAdjust,
  options,
  target,
  onTargetChange,
  onApply,
  adjustError,
  onDiscard,
  pending,
  saveDisabled,
  saveHint,
  saveHintId,
}: {
  sumMicro: number;
  incomeCents: number | null;
  /** False when the set has no rows (only its removal is left to save): there is no sum to report. */
  hasRows: boolean;
  dirty: boolean;
  /** The select and the apply button: only with at least two rows while the sum is not 100%. */
  showAdjust: boolean;
  options: AdjustOption[];
  /** Key of the row that would absorb the gap. */
  target: string | null;
  onTargetChange: (key: string) => void;
  onApply: (key: string) => void;
  adjustError: string | null;
  onDiscard: () => void;
  pending: boolean;
  saveDisabled: boolean;
  saveHint: string | null;
  saveHintId: string;
}) {
  const selectId = useId();
  const gap = sumGap(sumMicro, incomeCents);
  const over = sumMicro > TOTAL_MICRO;
  const selected = options.find((o) => o.key === target);
  // The same math "apply" runs, shown before the click.
  const preview = selected ? adjustToTotal(selected.micro ?? 0, sumMicro) : null;

  return (
    <div className="sticky bottom-20 z-20 space-y-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg md:bottom-4">
      {hasRows && (
        <p
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium ${
            gap.direction === "exact" ? "text-success" : gap.direction === "under" ? "text-warning" : "text-destructive"
          }`}
        >
          {gap.direction === "exact" ? (
            <CheckCircle2Icon aria-hidden className="size-4 shrink-0" />
          ) : (
            <AlertCircleIcon aria-hidden className="size-4 shrink-0" />
          )}
          {gap.direction === "exact" ? "100% alocado" : gap.text}
          {dirty && <span className="font-normal text-muted-foreground">· Alterações não salvas</span>}
        </p>
      )}
      {!hasRows && <p className="text-sm text-muted-foreground">Alterações não salvas</p>}

      {showAdjust && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Label htmlFor={selectId} className="text-sm">
            {over ? "Descontar de" : "Acrescentar em"}
          </Label>
          <div className="w-full sm:w-56">
            <SelectField
              id={selectId}
              value={target ?? ""}
              onValueChange={(v) => v !== "" && onTargetChange(v)}
              options={options.map((o) => ({ value: o.key, label: o.label }))}
            />
          </div>
          {selected && preview && (
            <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
              {preview.ok
                ? `${formatPercent(selected.micro ?? 0)} → ${formatPercent(preview.value)}`
                : "Não cabe nesta categoria"}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={target === null || (preview !== null && !preview.ok)}
            onClick={() => target !== null && onApply(target)}
          >
            {over ? "Descontar" : "Acrescentar"}
          </Button>
        </div>
      )}
      {adjustError && (
        <p role="alert" className="text-sm text-destructive">
          {adjustError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {saveHint && (
          <span id={saveHintId} className="mr-auto text-sm text-muted-foreground">
            {saveHint}
          </span>
        )}
        <Button type="button" variant="outline" disabled={pending || !dirty} onClick={onDiscard}>
          Descartar
        </Button>
        <Button
          type="submit"
          disabled={saveDisabled || pending}
          title={saveHint ?? undefined}
          aria-describedby={saveHint ? saveHintId : undefined}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
