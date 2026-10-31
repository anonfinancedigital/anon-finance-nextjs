import { describe, expect, it } from "vitest";
import {
  addMonths,
  endForInstallments,
  formatMonthLabel,
  formatMonthShort,
  installmentCount,
  parseMonthKey,
  recurrenceSummary,
} from "./recurrence-plan";

describe("parseMonthKey", () => {
  it("reads a valid month and rejects the rest", () => {
    expect(parseMonthKey("2026-10")).toEqual({ year: 2026, month: 10 });
    for (const bad of ["", "2026-13", "2026-00", "2026-1", "26-10", "2026-10-01"]) {
      expect(parseMonthKey(bad)).toBeNull();
    }
  });
});

describe("addMonths", () => {
  it("moves across month and year ends", () => {
    expect(addMonths("2026-10", 1)).toBe("2026-11");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 11)).toBe("2027-10");
  });

  it("is null for an invalid month", () => {
    expect(addMonths("nope", 1)).toBeNull();
  });
});

describe("installmentCount", () => {
  it("counts both ends", () => {
    expect(installmentCount("2026-11", "2026-11")).toBe(1);
    expect(installmentCount("2026-11", "2027-10")).toBe(12);
    expect(installmentCount("2026-01", "2028-12")).toBe(36);
  });

  it("is null when the end is before the start or a month is invalid", () => {
    expect(installmentCount("2026-11", "2026-10")).toBeNull();
    expect(installmentCount("", "2026-10")).toBeNull();
    expect(installmentCount("2026-11", "")).toBeNull();
  });
});

describe("endForInstallments", () => {
  it("gives the last month of N occurrences, the start month being the first", () => {
    expect(endForInstallments("2026-11", 1)).toBe("2026-11");
    expect(endForInstallments("2026-11", 12)).toBe("2027-10");
    expect(endForInstallments("2026-11", 3)).toBe("2027-01");
  });

  it("round-trips with installmentCount", () => {
    for (const n of [3, 6, 12, 24]) {
      expect(installmentCount("2026-11", endForInstallments("2026-11", n)!)).toBe(n);
    }
  });

  it("is null for a count below 1 or an invalid start", () => {
    expect(endForInstallments("2026-11", 0)).toBeNull();
    expect(endForInstallments("", 3)).toBeNull();
  });
});

describe("month labels", () => {
  it("short: three letters and the year", () => {
    expect(formatMonthShort("2026-11")).toBe("nov/2026");
    expect(formatMonthShort("2027-03")).toBe("mar/2027");
  });

  it("long: the month name and the year", () => {
    expect(formatMonthLabel("2026-10")).toBe("outubro de 2026");
  });

  it("leaves an invalid month as typed", () => {
    expect(formatMonthShort("x")).toBe("x");
    expect(formatMonthLabel("x")).toBe("x");
  });
});

describe("recurrenceSummary", () => {
  it("shows count, period and the total of the repeated amount", () => {
    expect(recurrenceSummary({ start: "2026-11", end: "2027-10", amountCents: 15_000 })).toBe(
      "12 parcelas · nov/2026 a out/2027 · 12 × R$ 150,00 = R$ 1.800,00",
    );
  });

  it("uses the singular for one occurrence", () => {
    expect(recurrenceSummary({ start: "2026-11", end: "2026-11", amountCents: 9_990 })).toBe(
      "1 parcela · nov/2026 a nov/2026 · 1 × R$ 99,90 = R$ 99,90",
    );
  });

  it("leaves the amount part out without a valid amount", () => {
    expect(recurrenceSummary({ start: "2026-11", end: "2027-01", amountCents: null })).toBe(
      "3 parcelas · nov/2026 a jan/2027",
    );
  });

  it("is null when the period is not valid", () => {
    expect(recurrenceSummary({ start: "2026-11", end: "2026-10", amountCents: 100 })).toBeNull();
    expect(recurrenceSummary({ start: "2026-11", end: "", amountCents: 100 })).toBeNull();
  });

  it("uses a plain space in R$ amounts", () => {
    expect(recurrenceSummary({ start: "2026-11", end: "2026-12", amountCents: 100 })).not.toContain(" ");
  });
});
