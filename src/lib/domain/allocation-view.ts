import { MICRO_PER_PERCENT, sumLabel, TOTAL_MICRO } from "./percent";

export type AllocationView = {
  /** No category rows: show the empty state instead of the table. */
  empty: boolean;
  showSumWarning: boolean;
  /** Select and "Rebalancear": only when there are at least two rows to rebalance between. */
  showAdjust: boolean;
  showSave: boolean;
  /** Save is blocked while rows exist and their sum is not 100%; an empty set has no sum to check. */
  saveDisabled: boolean;
  /** Why saving is blocked, or null when it is allowed (or the button is hidden). */
  saveHint: string | null;
  /** Bar fill in percent, clamped to 0..100. */
  progressValue: number;
  progressText: string;
};

/**
 * What the allocation editor shows, from its number of rows and the sum of their percentages in micro-percent.
 * `savedCount` is how many categories are stored: with no rows, saving stays available to store their removal.
 */
export function allocationView(
  rowCount: number,
  sumMicro: number,
  savedCount = 0,
): AllocationView {
  const complete = sumMicro === TOTAL_MICRO;
  const showSave = rowCount >= 1 || savedCount >= 1;
  return {
    empty: rowCount === 0,
    showSumWarning: rowCount >= 1 && !complete,
    showAdjust: rowCount >= 2 && !complete,
    showSave,
    saveDisabled: rowCount >= 1 && !complete,
    saveHint: rowCount >= 1 && !complete ? "Some 100% para salvar" : null,
    progressValue: Math.min(100, Math.max(0, sumMicro / MICRO_PER_PERCENT)),
    progressText: `${sumMicro === 0 ? "0%" : sumLabel(sumMicro)} de 100% alocado`,
  };
}
