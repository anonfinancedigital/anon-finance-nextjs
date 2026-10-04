import { describe, expect, it } from "vitest";
import {
  type Segment,
  appliesInMonth,
  lastDayOfMonth,
  monthKey,
  occurrenceDate,
  previousMonthKey,
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
