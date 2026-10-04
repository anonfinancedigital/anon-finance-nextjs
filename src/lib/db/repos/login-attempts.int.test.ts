import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";
import { db } from "../client";
import { loginAttempt } from "../schema";
import { loginAttemptsRepo } from "./login-attempts";

setupTestDb();

const MINUTE = 60_000;
const windowStart = () => new Date(Date.now() - 15 * MINUTE);

describe("loginAttemptsRepo", () => {
  it("counts the failures recorded inside the window", async () => {
    for (let i = 0; i < 3; i++) await loginAttemptsRepo.recordFailure("a@x.com");
    expect(await loginAttemptsRepo.countRecentFailures("a@x.com", windowStart())).toBe(3);
  });

  it("does not count failures older than the window (16 minutes)", async () => {
    await db
      .insert(loginAttempt)
      .values({ email: "a@x.com", attemptedAt: new Date(Date.now() - 16 * MINUTE) });
    await loginAttemptsRepo.recordFailure("a@x.com");
    expect(await loginAttemptsRepo.countRecentFailures("a@x.com", windowStart())).toBe(1);
  });

  it("counts e-mails that differ only in case together", async () => {
    await loginAttemptsRepo.recordFailure("A@x.com");
    await loginAttemptsRepo.recordFailure("a@x.com");
    expect(await loginAttemptsRepo.countRecentFailures("a@x.com", windowStart())).toBe(2);
    expect(await loginAttemptsRepo.countRecentFailures("A@X.COM", windowStart())).toBe(2);
  });

  it("clear resets the count of that e-mail only", async () => {
    await loginAttemptsRepo.recordFailure("a@x.com");
    await loginAttemptsRepo.recordFailure("b@x.com");
    await loginAttemptsRepo.clear("A@x.com");
    expect(await loginAttemptsRepo.countRecentFailures("a@x.com", windowStart())).toBe(0);
    expect(await loginAttemptsRepo.countRecentFailures("b@x.com", windowStart())).toBe(1);
  });

  it("oldestRecentFailure returns the oldest failure inside the window, or null", async () => {
    const outside = new Date(Date.now() - 16 * MINUTE);
    const oldest = new Date(Date.now() - 10 * MINUTE);
    await db.insert(loginAttempt).values([
      { email: "a@x.com", attemptedAt: outside },
      { email: "a@x.com", attemptedAt: oldest },
      { email: "a@x.com", attemptedAt: new Date(Date.now() - 2 * MINUTE) },
    ]);
    expect(await loginAttemptsRepo.oldestRecentFailure("A@x.com", windowStart())).toEqual(oldest);
    expect(await loginAttemptsRepo.oldestRecentFailure("b@x.com", windowStart())).toBeNull();
  });
});
