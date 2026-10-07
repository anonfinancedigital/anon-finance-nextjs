const MAX_INTERVALS = 8;

/**
 * Whole ages from `first` (the current whole age, `summary.currentAge`) to the last point, at most `MAX_INTERVALS + 1` labels. The first whole
 * age (the current age) and the last age are always ticks; the step runs forward from the first.
 */
export function ageTicks(first: number, last: number): number[] {
  const from = Math.floor(first);
  const to = Math.floor(last);
  if (to < from) return [];
  const step = Math.max(1, Math.ceil((to - from) / MAX_INTERVALS));
  const ticks: number[] = [];
  for (let age = from; age < to; age += step) ticks.push(age);
  ticks.push(to);
  return ticks;
}
