import { describe, expect, it } from "vitest";
import { currentMonth, isValidCalendarDate, monthHref, monthRange, parseMonth } from "./month";

describe("currentMonth", () => {
  it("uses America/Sao_Paulo: 2026-02-01T02:30Z is 23:30 on Jan 31, so January", () => {
    expect(currentMonth(new Date("2026-02-01T02:30:00Z"))).toEqual({ year: 2026, month: 1 });
  });

  it("returns the calendar month in Sao Paulo for a mid-month instant", () => {
    expect(currentMonth(new Date("2026-10-15T12:00:00Z"))).toEqual({ year: 2026, month: 10 });
  });
});

describe("parseMonth", () => {
  const now = new Date("2026-02-01T02:30:00Z"); // jan/2026 in Sao Paulo

  it("parses AAAA-MM", () => {
    expect(parseMonth("2026-10", now)).toEqual({ year: 2026, month: 10 });
  });

  it.each([["2026-13"], ["x"], [undefined]])("falls back to the current month for %j", (param) => {
    expect(parseMonth(param, now)).toEqual({ year: 2026, month: 1 });
  });
});

describe("monthRange", () => {
  it("crosses the year boundary for December", () => {
    expect(monthRange({ year: 2026, month: 12 })).toEqual({
      start: "2026-12-01",
      endExclusive: "2027-01-01",
    });
  });

  it("returns the first day of the month and of the next month", () => {
    expect(monthRange({ year: 2026, month: 10 })).toEqual({
      start: "2026-10-01",
      endExclusive: "2026-11-01",
    });
  });
});

describe("isValidCalendarDate", () => {
  it.each([
    ["2025-02-29", false],
    ["2024-02-29", true],
    ["", false],
    ["2026-04-31", false],
  ])("%j → %s", (iso, valid) => {
    expect(isValidCalendarDate(iso)).toBe(valid);
  });
});

describe("monthHref", () => {
  it("changes only mes and keeps the filter parameters", () => {
    const href = monthHref("mes=2026-10&categoria=c1&subcategoria=nenhuma", "2026-11");
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      mes: "2026-11",
      categoria: "c1",
      subcategoria: "nenhuma",
    });
  });

  it("adds mes when the URL has none", () => {
    expect(monthHref("", "2026-11")).toBe("/?mes=2026-11");
  });
});
