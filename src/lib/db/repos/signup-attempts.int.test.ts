import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";
import { db } from "../client";
import { signupAttempt } from "../schema";
import { signupAttemptsRepo } from "./signup-attempts";

setupTestDb();

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE);

describe("signupAttemptsRepo.recentSince", () => {
  it("returns the instants of the hash inside the window, oldest first", async () => {
    const [t5, t30, t10] = [ago(5), ago(30), ago(10)];
    await db.insert(signupAttempt).values([
      { ipHash: "h1", attemptedAt: t5 },
      { ipHash: "h1", attemptedAt: t30 },
      { ipHash: "h1", attemptedAt: t10 },
    ]);
    const times = await signupAttemptsRepo.recentSince("h1", ago(60));
    expect(times.map((t) => t.getTime())).toEqual([t30, t10, t5].map((t) => t.getTime()));
  });

  it("ignores rows of other hashes", async () => {
    await db.insert(signupAttempt).values([
      { ipHash: "h1", attemptedAt: ago(5) },
      { ipHash: "h2", attemptedAt: ago(5) },
    ]);
    expect(await signupAttemptsRepo.recentSince("h1", ago(60))).toHaveLength(1);
    expect(await signupAttemptsRepo.recentSince("h3", ago(60))).toHaveLength(0);
  });

  it("ignores rows before `since` and keeps the one exactly at `since`", async () => {
    const since = ago(60);
    await db.insert(signupAttempt).values([
      { ipHash: "h1", attemptedAt: new Date(since.getTime() - 1) },
      { ipHash: "h1", attemptedAt: since },
      { ipHash: "h1", attemptedAt: ago(1) },
    ]);
    const times = await signupAttemptsRepo.recentSince("h1", since);
    expect(times).toHaveLength(2);
    expect(times[0].getTime()).toBe(since.getTime());
  });
});
