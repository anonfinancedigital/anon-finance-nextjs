import { describe, expect, it } from "vitest";
import { previousDay, todayInSaoPaulo } from "./day";

describe("todayInSaoPaulo", () => {
  it("is still the previous day in São Paulo just after midnight UTC", () => {
    // 02:30 UTC is 23:30 of the previous day at UTC-3.
    expect(todayInSaoPaulo(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10-31");
  });

  it("is the same day in the middle of the day", () => {
    expect(todayInSaoPaulo(new Date("2026-10-31T15:00:00Z"))).toBe("2026-10-31");
  });
});

describe("previousDay", () => {
  it("goes back one day within a month", () => {
    expect(previousDay("2026-10-31")).toBe("2026-10-30");
  });

  it("crosses the start of a month", () => {
    expect(previousDay("2026-11-01")).toBe("2026-10-31");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });

  it("crosses the start of a year and a leap day", () => {
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
    expect(previousDay("2028-03-01")).toBe("2028-02-29");
  });
});
