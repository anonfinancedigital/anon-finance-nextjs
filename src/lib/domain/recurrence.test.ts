import { describe, expect, it } from "vitest";
import {
  type EditPlan,
  type Segment,
  appliesInMonth,
  lastDayOfMonth,
  monthKey,
  occurrenceDate,
  planDelete,
  installmentOf,
  planEdit,
  previousMonthKey,
  resolveDay,
  startOfSeries,
} from "./recurrence";

const recurring = (date: string, endMonth: string | null = null, day?: number): Segment => ({
  id: "s1",
  seriesId: "s1",
  date,
  recurringDay: day ?? Number(date.slice(8)),
  endMonth,
});
const single = (date: string): Segment => ({
  id: "a1",
  seriesId: null,
  date,
  recurringDay: null,
  endMonth: null,
});

describe("monthKey / previousMonthKey / lastDayOfMonth", () => {
  it("takes the AAAA-MM of a date", () => {
    expect(monthKey("2026-10-15")).toBe("2026-10");
  });

  it("goes back one month, crossing the year", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(previousMonthKey("2026-11")).toBe("2026-10");
  });

  it("knows the last day of short, long and leap months", () => {
    expect(lastDayOfMonth("2026-02")).toBe(28);
    expect(lastDayOfMonth("2028-02")).toBe(29);
    expect(lastDayOfMonth("2026-04")).toBe(30);
    expect(lastDayOfMonth("2026-12")).toBe(31);
  });
});

describe("occurrenceDate", () => {
  it("uses the intended day in the shown month (15/10 → 15/11)", () => {
    expect(occurrenceDate(recurring("2026-10-15"), "2026-11")).toBe("2026-11-15");
  });

  it("uses the last day of a short month for day 31", () => {
    const seg = recurring("2026-01-31");
    expect(occurrenceDate(seg, "2026-02")).toBe("2026-02-28");
    expect(occurrenceDate(seg, "2028-02")).toBe("2028-02-29");
    expect(occurrenceDate(seg, "2026-04")).toBe("2026-04-30");
  });

  it("keeps the intended day after a short month (stored 28/02, day 31 → 31/03)", () => {
    expect(occurrenceDate(recurring("2026-02-28", null, 31), "2026-03")).toBe("2026-03-31");
  });

  it("returns the stored date of a non-recurring row unchanged", () => {
    expect(occurrenceDate(single("2026-10-15"), "2026-11")).toBe("2026-10-15");
  });
});

describe("appliesInMonth", () => {
  it("is false before the month of the date", () => {
    expect(appliesInMonth(recurring("2026-10-15"), "2026-09")).toBe(false);
  });

  it("is true from the month of the date through the final month, inclusive", () => {
    const seg = recurring("2026-10-15", "2027-01");
    expect(["2026-10", "2026-11", "2026-12", "2027-01"].map((k) => appliesInMonth(seg, k))).toEqual(
      [true, true, true, true],
    );
  });

  it("is false after the final month", () => {
    expect(appliesInMonth(recurring("2026-10-15", "2027-01"), "2027-02")).toBe(false);
  });

  it("is true forever without a final month", () => {
    expect(appliesInMonth(recurring("2026-10-15"), "2099-12")).toBe(true);
  });

  it("applies a non-recurring row only to the month of its date", () => {
    const seg = single("2026-10-15");
    expect(appliesInMonth(seg, "2026-10")).toBe(true);
    expect(appliesInMonth(seg, "2026-11")).toBe(false);
  });
});

/** A segment of series "S" starting at `date` (day = intended day). */
const seg = (id: string, date: string, endMonth: string | null = null): Segment => ({
  id,
  seriesId: "S",
  date,
  recurringDay: Number(date.slice(8)),
  endMonth,
});

describe("planDelete", () => {
  // Series S split twice: a (Oct–Nov), b (Dec–Jan), c (Feb onward).
  const segments = [
    seg("a", "2026-10-15", "2026-11"),
    seg("b", "2026-12-15", "2027-01"),
    seg("c", "2027-02-15"),
  ];

  it("deletes the segment starting in the month and every later one of the series", () => {
    expect(planDelete({ segments, id: "b", month: "2026-12" })).toEqual({
      deleteIds: ["b", "c"],
    });
  });

  it("deletes the whole series when deleting in the month the series starts", () => {
    expect(planDelete({ segments, id: "a", month: "2026-10" })).toEqual({
      deleteIds: ["a", "b", "c"],
    });
  });

  it("ends a segment that started earlier in the previous month and deletes the later ones", () => {
    expect(planDelete({ segments, id: "a", month: "2026-11" })).toEqual({
      deleteIds: ["b", "c"],
      truncate: { id: "a", endMonth: "2026-10" },
    });
  });

  it("keeps the earlier segments of the series", () => {
    const plan = planDelete({ segments, id: "c", month: "2027-03" });
    expect(plan).toEqual({ deleteIds: [], truncate: { id: "c", endMonth: "2027-02" } });
  });

  it("deletes only the row itself for a non-recurring row", () => {
    const rows = [single("2026-10-15"), { ...single("2026-10-20"), id: "a2" }, ...segments];
    expect(planDelete({ segments: rows, id: "a1", month: "2026-10" })).toEqual({
      deleteIds: ["a1"],
    });
  });

  it("ignores segments of other series", () => {
    const other = { ...seg("x", "2027-01-10"), seriesId: "X" };
    expect(planDelete({ segments: [...segments, other], id: "b", month: "2026-12" })).toEqual({
      deleteIds: ["b", "c"],
    });
  });
});

describe("resolveDay", () => {
  it("keeps day 31 when the submitted date is the projected 28/02", () => {
    expect(resolveDay(seg("a", "2026-01-31"), "2026-02", "2026-02-28")).toBe(31);
  });

  it("uses the submitted day when it differs from the projected one", () => {
    expect(resolveDay(seg("a", "2026-01-31"), "2026-02", "2026-02-27")).toBe(27);
    expect(resolveDay(seg("a", "2026-10-15"), "2026-12", "2026-12-20")).toBe(20);
  });

  it("uses the submitted day for a non-recurring row", () => {
    expect(resolveDay(single("2026-02-28"), "2026-02", "2026-02-28")).toBe(28);
  });
});

const forever = (date: string) => ({ date, recurring: true, endMonth: null });

/** Applies a plan to an in-memory table; an inserted segment gets id `newId`. */
function apply(segments: Segment[], plan: EditPlan, newId: string): Segment[] {
  let next = segments.filter((s) => !plan.deleteIds.includes(s.id));
  next = next.map((s) => {
    if (plan.updateInPlace?.id === s.id) return plan.updateInPlace;
    if (plan.truncate?.id === s.id) return { ...s, endMonth: plan.truncate.endMonth };
    return s;
  });
  return plan.insert ? [...next, { id: newId, ...plan.insert }] : next;
}

/** The segment of series "S" (or the given row) that applies in each month. */
const seriesIn = (segments: Segment[], months: string[]) =>
  months.map((m) =>
    segments.filter((s) => s.seriesId === "S" && appliesInMonth(s, m)).map((s) => s.id),
  );

/** Finds the segment that applies to `month` in series "S" and plans an edit on it. */
function editSeries(segments: Segment[], month: string, date: string, newId: string) {
  const target = segments.find((s) => s.seriesId === "S" && appliesInMonth(s, month))!;
  return apply(segments, planEdit({ segments, id: target.id, month, next: forever(date) }), newId);
}

describe("planEdit", () => {
  const origin = seg("S", "2026-10-15");

  it("splits in a middle month: the original ends in M-1, a new segment starts in M", () => {
    const plan = planEdit({
      segments: [origin],
      id: "S",
      month: "2026-12",
      next: forever("2026-12-20"),
    });
    expect(plan).toEqual({
      deleteIds: [],
      truncate: { id: "S", endMonth: "2026-11" },
      insert: { seriesId: "S", date: "2026-12-20", recurringDay: 20, endMonth: null },
    });
  });

  it("keeps the earlier months on the original segment after a split", () => {
    const after = editSeries([origin], "2026-12", "2026-12-15", "n1");
    expect(seriesIn(after, ["2026-10", "2026-11", "2026-12", "2027-01"])).toEqual([
      ["S"],
      ["S"],
      ["n1"],
      ["n1"],
    ]);
  });

  it("updates in place when editing the month the series starts, without inserting", () => {
    const plan = planEdit({
      segments: [origin],
      id: "S",
      month: "2026-10",
      next: { date: "2026-10-10", recurring: true, endMonth: "2027-03" },
    });
    expect(plan).toEqual({
      deleteIds: [],
      updateInPlace: {
        id: "S",
        seriesId: "S",
        date: "2026-10-10",
        recurringDay: 10,
        endMonth: "2027-03",
      },
    });
  });

  it("editing M then N > M keeps M's segment from M to N-1", () => {
    let segments = editSeries([origin], "2026-12", "2026-12-15", "m");
    const plan = planEdit({ segments, id: "m", month: "2027-02", next: forever("2027-02-15") });
    expect(plan.truncate).toEqual({ id: "m", endMonth: "2027-01" });
    expect(plan.deleteIds).toEqual([]);
    segments = apply(segments, plan, "n");
    expect(seriesIn(segments, ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03"])).toEqual([
      ["S"],
      ["m"],
      ["m"],
      ["n"],
      ["n"],
    ]);
  });

  it("editing M after editing N > M deletes N's segment", () => {
    let segments = editSeries([origin], "2027-02", "2027-02-15", "n");
    const target = segments.find((s) => s.id === "S")!;
    const plan = planEdit({
      segments,
      id: target.id,
      month: "2026-12",
      next: forever("2026-12-15"),
    });
    expect(plan.deleteIds).toEqual(["n"]);
    segments = apply(segments, plan, "m");
    expect(seriesIn(segments, ["2026-11", "2026-12", "2027-02", "2027-06"])).toEqual([
      ["S"],
      ["m"],
      ["m"],
      ["m"],
    ]);
  });

  it("makes the edited month a single row when the new data is not recurring", () => {
    const segments = [origin, seg("n", "2027-02-15")];
    const plan = planEdit({
      segments,
      id: "S",
      month: "2026-12",
      next: { date: "2026-12-15", recurring: false, endMonth: null },
    });
    expect(plan).toEqual({
      deleteIds: ["n"],
      truncate: { id: "S", endMonth: "2026-11" },
      insert: { seriesId: null, date: "2026-12-15", recurringDay: null, endMonth: null },
    });
  });

  it("makes a series-start segment a single row when edited to not recurring", () => {
    const plan = planEdit({
      segments: [origin],
      id: "S",
      month: "2026-10",
      next: { date: "2026-10-15", recurring: false, endMonth: null },
    });
    expect(plan.updateInPlace).toEqual({
      id: "S",
      seriesId: null,
      date: "2026-10-15",
      recurringDay: null,
      endMonth: null,
    });
  });

  it("turns a single row into a series whose id is the row id", () => {
    const plan = planEdit({
      segments: [single("2026-10-15")],
      id: "a1",
      month: "2026-10",
      next: forever("2026-10-31"),
    });
    expect(plan).toEqual({
      deleteIds: [],
      updateInPlace: {
        id: "a1",
        seriesId: "a1",
        date: "2026-10-31",
        recurringDay: 31,
        endMonth: null,
      },
    });
  });

  it("keeps day 31 when the edit resubmits the projected 28/02", () => {
    const plan = planEdit({
      segments: [seg("S", "2026-01-31")],
      id: "S",
      month: "2026-02",
      next: forever("2026-02-28"),
    });
    expect(plan.insert).toEqual({
      seriesId: "S",
      date: "2026-02-28",
      recurringDay: 31,
      endMonth: null,
    });
  });

  it("never leaves two occurrences of a series in the same month (invariant)", () => {
    const months = Array.from({ length: 24 }, (_, i) => {
      const y = 2026 + Math.floor((9 + i) / 12);
      return `${y}-${String(((9 + i) % 12) + 1).padStart(2, "0")}`;
    });
    // Edits and deletes in mixed order, including re-edits of earlier months and the start month.
    const steps: [kind: "edit" | "delete", month: string][] = [
      ["edit", "2026-12"],
      ["edit", "2027-03"],
      ["edit", "2027-01"],
      ["edit", "2027-06"],
      ["edit", "2027-06"],
      ["delete", "2027-09"],
      ["edit", "2026-11"],
      ["edit", "2027-02"],
      ["delete", "2027-04"],
      ["edit", "2026-10"],
      ["edit", "2027-01"],
    ];
    let segments: Segment[] = [origin];
    steps.forEach(([kind, month], i) => {
      const target = segments.find((s) => s.seriesId === "S" && appliesInMonth(s, month))!;
      expect(target).toBeDefined();
      const plan =
        kind === "edit"
          ? planEdit({ segments, id: target.id, month, next: forever(`${month}-15`) })
          : planDelete({ segments, id: target.id, month });
      segments = apply(segments, plan, `n${i}`);
      for (const ids of seriesIn(segments, months)) expect(ids.length).toBeLessThanOrEqual(1);
    });
    // Re-editing the start month rebuilt one endless segment; the final Jan/2027 edit split it.
    expect(seriesIn(segments, ["2026-12", "2027-01", "2028-01"])).toEqual([
      ["S"],
      ["n10"],
      ["n10"],
    ]);
  });
});

describe("startOfSeries", () => {
  it("is the earliest segment start, whatever the order", () => {
    const later = { ...recurring("2026-12-10"), id: "s2" };
    expect(startOfSeries([later, recurring("2026-05-10", "2026-11")])).toBe("2026-05");
  });
});

describe("installmentOf", () => {
  const series12 = [recurring("2026-05-10", "2027-04")];

  it("is 1/12 in the start month and 12/12 in the end month of a 12-month series", () => {
    expect(installmentOf(series12, "2026-05")).toEqual({ number: 1, total: 12 });
    expect(installmentOf(series12, "2027-04")).toEqual({ number: 12, total: 12 });
  });

  it("counts a middle month (July of 05/2026-12/2026 is 3/8)", () => {
    expect(installmentOf([recurring("2026-05-10", "2026-12")], "2026-07")).toEqual({
      number: 3,
      total: 8,
    });
  });

  it("is 1/1 when the start month is the end month", () => {
    expect(installmentOf([recurring("2026-10-10", "2026-10")], "2026-10")).toEqual({
      number: 1,
      total: 1,
    });
  });

  it("counts continuously across the year change (11/2026-02/2027)", () => {
    const seg = [recurring("2026-11-10", "2027-02")];
    expect(installmentOf(seg, "2026-11")).toEqual({ number: 1, total: 4 });
    expect(installmentOf(seg, "2027-02")).toEqual({ number: 4, total: 4 });
  });

  it("counts N from the series start and T to the last segment end after a mid-series edit", () => {
    const first = recurring("2026-05-10", "2026-11");
    const second = { ...recurring("2026-12-10", "2027-04"), id: "s2" };
    expect(installmentOf([first, second], "2026-07")).toEqual({ number: 3, total: 12 });
    expect(installmentOf([first, second], "2026-12")).toEqual({ number: 8, total: 12 });
  });

  it("is null when the last segment has no end", () => {
    const first = recurring("2026-05-10", "2026-11");
    const open = { ...recurring("2026-12-10"), id: "s2" };
    expect(installmentOf([first, open], "2026-07")).toBeNull();
    expect(installmentOf([recurring("2026-05-10")], "2026-07")).toBeNull();
  });

  it("is null for a non-recurring row", () => {
    expect(installmentOf([single("2026-05-10")], "2026-05")).toBeNull();
  });
});

describe("planEdit with a start month", () => {
  const until = (date: string, startMonth: string | null, endMonth = "2027-03") => ({
    date,
    recurring: true,
    endMonth,
    startMonth,
  });

  it("moves the first occurrence to the day of the data in the new start month", () => {
    const seg = recurring("2026-04-10", "2026-12");
    const plan = planEdit({
      segments: [seg],
      id: "s1",
      month: "2026-04",
      next: until("2026-04-10", "2026-06"),
    });
    expect(plan.updateInPlace).toMatchObject({ date: "2026-06-10", recurringDay: 10 });
    expect(plan.truncate).toBeUndefined();
  });

  it("clamps day 31 to the last day of a shorter start month but keeps the intended day", () => {
    const seg = recurring("2026-01-31", "2026-12");
    const plan = planEdit({
      segments: [seg],
      id: "s1",
      month: "2026-01",
      next: until("2026-01-31", "2026-04"),
    });
    expect(plan.updateInPlace).toMatchObject({ date: "2026-04-30", recurringDay: 31 });
  });

  it("ignores the start month when editing a month in the middle of the series", () => {
    const seg = recurring("2026-04-10", "2026-12");
    const plan = planEdit({
      segments: [seg],
      id: "s1",
      month: "2026-08",
      next: until("2026-08-10", "2026-02"),
    });
    expect(plan.truncate).toEqual({ id: "s1", endMonth: "2026-07" });
    expect(plan.insert).toMatchObject({ date: "2026-08-10", endMonth: "2027-03" });
  });

  it("ignores the start month of a later segment that starts in the edited month", () => {
    const first = recurring("2026-04-10", "2026-07");
    const second = { ...recurring("2026-08-10", "2026-12"), id: "s2" };
    const plan = planEdit({
      segments: [first, second],
      id: "s2",
      month: "2026-08",
      next: until("2026-08-10", "2026-10"),
    });
    expect(plan.updateInPlace).toMatchObject({ id: "s2", date: "2026-08-10" });
  });

  it("uses the start month when a single row becomes an until series", () => {
    const plan = planEdit({
      segments: [single("2026-04-10")],
      id: "a1",
      month: "2026-04",
      next: until("2026-04-10", "2026-05"),
    });
    expect(plan.updateInPlace).toMatchObject({ date: "2026-05-10", recurringDay: 10 });
  });

  it("keeps the submitted date without a start month or when not recurring", () => {
    const seg = recurring("2026-04-10", "2026-12");
    const noStart = planEdit({
      segments: [seg],
      id: "s1",
      month: "2026-04",
      next: until("2026-04-12", null),
    });
    expect(noStart.updateInPlace).toMatchObject({ date: "2026-04-12" });
    const single1 = planEdit({
      segments: [seg],
      id: "s1",
      month: "2026-04",
      next: { date: "2026-04-10", recurring: false, endMonth: null, startMonth: "2026-06" },
    });
    expect(single1.updateInPlace).toMatchObject({ date: "2026-04-10", recurringDay: null });
  });
});
