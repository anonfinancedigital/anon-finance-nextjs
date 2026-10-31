import { describe, expect, it } from "vitest";
import { formatDayHeading } from "./day-heading";

describe("formatDayHeading", () => {
  it("names the weekday, the day and the month, capitalized", () => {
    // 2026-10-28 is a Wednesday.
    expect(formatDayHeading("2026-10-28")).toBe("Quarta-feira, 28 de outubro");
  });

  it("does not pad the day and handles the first of the month", () => {
    // 2026-11-01 is a Sunday.
    expect(formatDayHeading("2026-11-01")).toBe("Domingo, 1 de novembro");
  });

  it("is the same day in any time zone of the machine (no off-by-one near midnight)", () => {
    // 2026-03-01 is a Sunday; a local-time parse in a UTC-3 zone would read it as Saturday the 28th.
    expect(formatDayHeading("2026-03-01")).toBe("Domingo, 1 de março");
  });
});
