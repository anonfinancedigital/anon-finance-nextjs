const MAX_INTERVALS = 8;

/**
 * Whole ages from the first to the last point, at most `MAX_INTERVALS + 1` labels. The step is
 * counted backwards from the last age so the final age is always a tick; the first whole age
 * may drop out when the step does not land on it.
 */
export function ageTicks(first: number, last: number): number[] {
  const from = Math.ceil(first);
  const to = Math.floor(last);
  const step = Math.max(1, Math.ceil((to - from) / MAX_INTERVALS));
  const ticks: number[] = [];
  for (let age = to; age >= from; age -= step) ticks.push(age);
  return ticks.reverse();
}
