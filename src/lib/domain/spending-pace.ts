import { monthRange, type YearMonth } from "./month";
import { mulDivRound } from "./percent";

export type SpendingPacePoint = {
  day: number;
  /** Accumulated expenses at the end of the day; null after today (current month) or in a future month. */
  spentCents: number | null;
  /** Straight-line share of the month's total target up to this day; null without a target. */
  idealCents: number | null;
};

export type SpendingPace = {
  points: SpendingPacePoint[];
  hasReference: boolean;
  hasSpending: boolean;
  /** The last spent value is above the ideal of the same day. */
  aboveIdeal: boolean;
};

type PaceOccurrence = { kind: "income" | "expense"; amountCents: number; date: string };

/** Day of month (1-based) of an AAAA-MM-DD date. */
const dayOf = (iso: string) => Number(iso.slice(8, 10));

/** Daily accumulated spending of a month against the pace that would spend the total target evenly. */
export function buildSpendingPace(input: {
  month: YearMonth;
  /** AAAA-MM-DD in America/Sao_Paulo. */
  today: string;
  totalTargetCents: number;
  occurrences: PaceOccurrence[];
}): SpendingPace {
  const { month, today, totalTargetCents, occurrences } = input;
  const { start, endExclusive } = monthRange(month);
  const days = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const hasReference = totalTargetCents > 0;
  // Last day that has a spent value: none before the month starts, all once it ended.
  const lastDay = today < start ? 0 : today >= endExclusive ? days : dayOf(today);

  const byDay = new Array<number>(days + 1).fill(0);
  let hasSpending = false;
  for (const o of occurrences) {
    if (o.kind !== "expense") continue;
    byDay[dayOf(o.date)] += o.amountCents;
    hasSpending = true;
  }

  let accumulated = 0;
  const points: SpendingPacePoint[] = [];
  for (let day = 1; day <= days; day++) {
    accumulated += byDay[day];
    points.push({
      day,
      spentCents: day <= lastDay ? accumulated : null,
      idealCents: hasReference ? mulDivRound(totalTargetCents, day, days) : null,
    });
  }

  const last = lastDay > 0 ? points[lastDay - 1] : null;
  const aboveIdeal = last !== null && last.idealCents !== null && last.spentCents! > last.idealCents;

  return { points, hasReference, hasSpending, aboveIdeal };
}
