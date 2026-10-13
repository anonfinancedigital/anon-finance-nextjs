import { describe, expect, it } from "vitest";
import { SIGNUP_MAX, SIGNUP_WINDOW_MS, signupLockMinutes } from "./signup-limit";

const NOW = Date.parse("2026-01-01T12:00:00Z");
const at = (msAgo: number) => new Date(NOW - msAgo);

describe("signupLockMinutes", () => {
  it("exposes the limit of 5 signups per 60 minutes", () => {
    expect(SIGNUP_MAX).toBe(5);
    expect(SIGNUP_WINDOW_MS).toBe(3_600_000);
  });

  it("is 0 with no signups", () => {
    expect(signupLockMinutes([], NOW)).toBe(0);
  });

  it("is 0 with 4 signups", () => {
    const times = [50, 40, 30, 20].map((m) => at(m * 60_000));
    expect(signupLockMinutes(times, NOW)).toBe(0);
  });

  it("locks with 5 signups until the oldest leaves the window", () => {
    const times = [50, 40, 30, 20, 10].map((m) => at(m * 60_000));
    expect(signupLockMinutes(times, NOW)).toBe(10);
  });

  it("rounds partial minutes up", () => {
    const times = [at(59 * 60_000 + 30_000), at(30 * 60_000), at(20 * 60_000), at(10 * 60_000), at(0)];
    expect(signupLockMinutes(times, NOW)).toBe(1);
  });

  it("uses the oldest of the 5 most recent when there are more than 5 (race)", () => {
    const times = [58, 50, 40, 30, 20, 10].map((m) => at(m * 60_000));
    expect(signupLockMinutes(times, NOW)).toBe(10);
  });

  it("releases in the exact millisecond the oldest signup leaves the window", () => {
    const times = [at(SIGNUP_WINDOW_MS), at(40 * 60_000), at(30 * 60_000), at(20 * 60_000), at(10 * 60_000)];
    expect(signupLockMinutes(times, NOW)).toBe(0);
  });

  it("still locks 1 ms before the oldest signup leaves the window", () => {
    const times = [at(SIGNUP_WINDOW_MS - 1), at(40 * 60_000), at(30 * 60_000), at(20 * 60_000), at(10 * 60_000)];
    expect(signupLockMinutes(times, NOW)).toBe(1);
  });
});
