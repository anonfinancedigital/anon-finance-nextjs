import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { financialGoal } from "../schema";
import { goalsRepo } from "./goals";

setupTestDb();

const GOAL = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 15_000_000,
  birthDate: "1990-06-15",
  retirementAge: 60,
  annualRateBp: 800 as const,
};

const rowsOf = (userId: string) => db.select().from(financialGoal).where(eq(financialGoal.userId, userId));

describe("goalsRepo.get", () => {
  it("returns null when the user has no goal", async () => {
    const userId = await insertTestUser();
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("returns the saved goal after upsert", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);
    expect(await goalsRepo.get(userId)).toEqual(GOAL);
  });

  it("does not show one user's goal to another", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);
    expect(await goalsRepo.get(otherId)).toBeNull();

    const otherGoal = { ...GOAL, savedCents: 0, retirementAge: 65 };
    await goalsRepo.upsert(otherId, otherGoal);
    expect(await goalsRepo.get(otherId)).toEqual(otherGoal);
    expect(await goalsRepo.get(userId)).toEqual(GOAL);
  });
});

describe("goalsRepo annual rate", () => {
  it.each([[600], [800], [1000]] as const)("saves and returns the rate %d", async (annualRateBp) => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp });
    expect((await goalsRepo.get(userId))?.annualRateBp).toBe(annualRateBp);
  });

  it("replaces the rate on a second upsert in the same row", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp: 600 });
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp: 1000 });

    expect((await goalsRepo.get(userId))?.annualRateBp).toBe(1000);
    expect(await rowsOf(userId)).toHaveLength(1);
  });

  it("returns 800 for a row inserted without a rate", async () => {
    const userId = await insertTestUser();
    const { monthlyIncomeCents, savedCents, birthDate, retirementAge } = GOAL;
    await db.insert(financialGoal).values({ userId, monthlyIncomeCents, savedCents, birthDate, retirementAge });

    expect((await goalsRepo.get(userId))?.annualRateBp).toBe(800);
  });

  it("refuses a rate outside 600, 800 and 1000 at the database", async () => {
    const userId = await insertTestUser();
    await expect(db.insert(financialGoal).values({ userId, ...GOAL, annualRateBp: 700 })).rejects.toThrow();
    expect(await goalsRepo.get(userId)).toBeNull();
  });
});

describe("goalsRepo.upsert", () => {
  it("replaces the values on a second upsert and keeps a single row", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);
    const replacement = {
      monthlyIncomeCents: 500_000,
      savedCents: 0,
      birthDate: "1985-02-28",
      retirementAge: 55,
      annualRateBp: 1000 as const,
    };
    await goalsRepo.upsert(userId, replacement);

    expect(await goalsRepo.get(userId)).toEqual(replacement);
    expect(await rowsOf(userId)).toHaveLength(1);
  });

  it("does not touch another user's row when replacing", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);
    await goalsRepo.upsert(otherId, GOAL);
    await goalsRepo.upsert(userId, { ...GOAL, savedCents: 1 });

    expect(await goalsRepo.get(otherId)).toEqual(GOAL);
  });

  it.each([
    ["income 0", { monthlyIncomeCents: 0 }],
    ["income above R$ 1.000.000,00", { monthlyIncomeCents: 100_000_001 }],
    ["negative saved", { savedCents: -1 }],
    ["saved above R$ 999.999.999,99", { savedCents: 100_000_000_000 }],
    ["retirement age 0", { retirementAge: 0 }],
    ["retirement age 121", { retirementAge: 121 }],
  ])("refuses a value outside the CHECK range (%s) and keeps the previous goal", async (_label, override) => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);

    await expect(goalsRepo.upsert(userId, { ...GOAL, ...override })).rejects.toThrow();
    expect(await goalsRepo.get(userId)).toEqual(GOAL);
  });

  it.each([
    ["income 1", { monthlyIncomeCents: 1 }],
    ["income R$ 1.000.000,00", { monthlyIncomeCents: 100_000_000 }],
    ["saved 0", { savedCents: 0 }],
    ["saved R$ 999.999.999,99", { savedCents: 99_999_999_999 }],
    ["retirement age 1", { retirementAge: 1 }],
    ["retirement age 120", { retirementAge: 120 }],
  ])("accepts the CHECK boundary (%s)", async (_label, override) => {
    const userId = await insertTestUser();
    const goal = { ...GOAL, ...override };
    await goalsRepo.upsert(userId, goal);
    expect(await goalsRepo.get(userId)).toEqual(goal);
  });
});
