import { MICRO_PER_PERCENT, sumLabel, TOTAL_MICRO } from "./percent";
import { sumGap } from "./sum-warning";

export type AllocationView = {
  /** No category rows: show the empty state instead of the table. */
  empty: boolean;
  /** The fixed bar with the sum status, the correction and "Salvar": while there is something to save or fix. */
  showBar: boolean;
  /** Select and "Descontar"/"Acrescentar": only when there are at least two rows to rebalance between. */
  showAdjust: boolean;
  /** Save is blocked while rows exist and their sum is not 100%; an empty set has no sum to check. */
  saveDisabled: boolean;
  /** Why saving is blocked, or null when it is allowed (or the bar is hidden). */
  saveHint: string | null;
  /** Bar fill in percent, clamped to 0..100. */
  progressValue: number;
  /** Where the sum stands: above, below or exactly at 100%. */
  progressTone: "over" | "under" | "exact";
  progressText: string;
};

/**
 * What the allocation editor shows, from its number of rows and the sum of their percentages in micro-percent.
 * `savedCount` is how many categories are stored: with no rows, saving stays available to store their removal.
 * `dirty` is whether the rows differ from the stored set.
 */
export function allocationView(
  rowCount: number,
  sumMicro: number,
  savedCount = 0,
  dirty = false,
): AllocationView {
  const complete = sumMicro === TOTAL_MICRO;
  const showSave = rowCount >= 1 || savedCount >= 1;
  const gap = sumGap(sumMicro, null);
  const placed = `${sumMicro === 0 ? "0%" : complete ? "100%" : sumLabel(sumMicro)} alocado`;
  const progressText =
    rowCount === 0 || complete
      ? placed
      : `${placed} · ${gap.direction === "over" ? `${gap.percent} acima de 100%` : `faltam ${gap.percent} para 100%`}`;
  return {
    empty: rowCount === 0,
    showBar: showSave && (dirty || (rowCount >= 1 && !complete)),
    showAdjust: rowCount >= 2 && !complete,
    saveDisabled: rowCount >= 1 && !complete,
    saveHint: rowCount >= 1 && !complete ? "Some 100% para salvar" : null,
    progressValue: Math.min(100, Math.max(0, sumMicro / MICRO_PER_PERCENT)),
    progressTone: gap.direction,
    progressText,
  };
}
