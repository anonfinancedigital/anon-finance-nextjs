import { describe, expect, it } from "vitest";
import {
  type Segment,
  appliesInMonth,
  lastDayOfMonth,
  monthKey,
  occurrenceDate,
  planDelete,
  previousMonthKey,
  resolveDay,
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
