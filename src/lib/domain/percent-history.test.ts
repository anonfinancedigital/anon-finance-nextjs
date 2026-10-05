import { describe, expect, it } from "vitest";
import { monthStartOf, resolvePercent } from "./percent-history";

const versions = [
  { fromMonth: "0001-01-01", percentMicro: 50_000_000 },
  { fromMonth: "2026-03-01", percentMicro: 40_000_000 },
  { fromMonth: "2026-06-01", percentMicro: 30_000_000 },
];

describe("resolvePercent", () => {
  it("uses the sentinel version for any month before the next one", () => {
    expect(resolvePercent(versions, "2020-01-01")).toBe(50_000_000);
    expect(resolvePercent(versions, "0001-01-01")).toBe(50_000_000);
  });

  it("uses a version in the month it starts", () => {
    expect(resolvePercent(versions, "2026-03-01")).toBe(40_000_000);
  });

  it("keeps the previous version in the month before a version starts", () => {
    expect(resolvePercent(versions, "2026-05-01")).toBe(40_000_000);
  });

  it("returns null before the first version", () => {
    expect(resolvePercent([{ fromMonth: "2026-03-01", percentMicro: 10_000_000 }], "2026-02-01")).toBeNull();
  });

  it("returns null without versions", () => {
    expect(resolvePercent([], "2026-03-01")).toBeNull();
  });

  it("uses the last version for a future month", () => {
    expect(resolvePercent(versions, "2030-12-01")).toBe(30_000_000);
  });

  it("does not depend on the input order", () => {
    const shuffled = [versions[2], versions[0], versions[1]];
    expect(resolvePercent(shuffled, "2026-04-01")).toBe(40_000_000);
    expect(resolvePercent(shuffled, "2026-06-01")).toBe(30_000_000);
    expect(resolvePercent(shuffled, "2025-01-01")).toBe(50_000_000);
  });
});

describe("monthStartOf", () => {
  it("formats the first day of the month", () => {
    expect(monthStartOf({ year: 2026, month: 3 })).toBe("2026-03-01");
    expect(monthStartOf({ year: 2026, month: 12 })).toBe("2026-12-01");
  });
});
