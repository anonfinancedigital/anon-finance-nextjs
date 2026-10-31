import { describe, expect, it } from "vitest";
import type { Segment } from "./recurrence";
import { hasOccurrenceOn, isDueHour, localClock } from "./push-schedule";

const seg = (over: Partial<Segment>): Segment => ({
  id: "s1",
  seriesId: "ser1",
  date: "2026-01-15",
  recurringDay: 15,
  endMonth: null,
  ...over,
});

describe("localClock (PUSH-24, PUSH-25)", () => {
  it("shows the previous local day when UTC has already rolled over", () => {
    expect(localClock(new Date("2026-11-01T02:30:00Z"))).toEqual({ date: "2026-10-31", hour: 23 });
  });

  it("converts midday UTC to 09:00 on the same day", () => {
    expect(localClock(new Date("2026-06-10T12:00:00Z"))).toEqual({ date: "2026-06-10", hour: 9 });
  });

  it("reads local midnight as hour 0, not 24", () => {
    expect(localClock(new Date("2026-06-10T03:00:00Z"))).toEqual({ date: "2026-06-10", hour: 0 });
  });
});

describe("hasOccurrenceOn (PUSH-25)", () => {
  it("is true for an active series on its day", () => {
    expect(hasOccurrenceOn([seg({})], "2026-10-15")).toBe(true);
  });

  it("is false on another day of the month", () => {
    expect(hasOccurrenceOn([seg({})], "2026-10-16")).toBe(false);
  });

  it("is false for a series that ended before the month", () => {
    expect(hasOccurrenceOn([seg({ endMonth: "2026-09" })], "2026-10-15")).toBe(false);
  });

  it("is true in the last month of a series", () => {
    expect(hasOccurrenceOn([seg({ endMonth: "2026-10" })], "2026-10-15")).toBe(true);
  });

  it("is false for a series that starts in a later month", () => {
    expect(hasOccurrenceOn([seg({ date: "2026-11-15" })], "2026-10-15")).toBe(false);
  });

  it("moves a day-31 series to the last day of shorter months", () => {
    const s = seg({ date: "2026-01-31", recurringDay: 31 });
    expect(hasOccurrenceOn([s], "2026-02-28")).toBe(true);
    expect(hasOccurrenceOn([s], "2026-02-27")).toBe(false);
    expect(hasOccurrenceOn([s], "2026-04-30")).toBe(true);
    expect(hasOccurrenceOn([s], "2026-04-29")).toBe(false);
    expect(hasOccurrenceOn([s], "2026-03-31")).toBe(true);
  });

  it("answers once when two series fall on the same day", () => {
    const a = seg({ id: "a", seriesId: "A" });
    const b = seg({ id: "b", seriesId: "B" });
    expect(hasOccurrenceOn([a, b], "2026-10-15")).toBe(true);
  });

  it("is false for no segments", () => {
    expect(hasOccurrenceOn([], "2026-10-15")).toBe(false);
  });

  it("ignores one-off rows, which are not recurring series", () => {
    expect(hasOccurrenceOn([seg({ seriesId: null, recurringDay: null, date: "2026-10-15" })], "2026-10-15")).toBe(
      false,
    );
  });
});

describe("isDueHour (PUSH-24)", () => {
  it("is true when the clock hour equals the preferred hour", () => {
    expect(isDueHour(9, 9)).toBe(true);
  });

  it("is true when the clock is past the preferred hour (catch-up)", () => {
    expect(isDueHour(14, 9)).toBe(true);
  });

  it("is false before the preferred hour", () => {
    expect(isDueHour(8, 9)).toBe(false);
  });
});
