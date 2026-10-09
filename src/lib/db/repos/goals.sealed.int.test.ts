import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { GoalDto } from "@/lib/vault/types";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { financialGoal } from "../schema";
import { goalsRepo } from "./goals";

setupTestDb();

const GOAL: GoalDto = {
  monthlyIncomeCt: "v1:renda",
  savedCt: "v1:guardado",
  retirementAgeCt: "v1:idade",
  annualRateCt: "v1:retorno",
  withdrawalRateCt: "v1:retirada",
};

const rawRows = (userId: string) =>
  db.select().from(financialGoal).where(eq(financialGoal.userId, userId));

describe("goalsRepo.getSealed", () => {
  it("returns null when the user has no goal", async () => {
    const userId = await insertTestUser();
    expect(await goalsRepo.getSealed(userId)).toBeNull();
  });

  it("returns the five sealed fields exactly as stored", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsertSealed(userId, GOAL);
    expect(await goalsRepo.getSealed(userId)).toEqual(GOAL);
  });

  it("does not return another user's goal", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await goalsRepo.upsertSealed(otherId, GOAL);
    expect(await goalsRepo.getSealed(userId)).toBeNull();
  });

  it("returns null for a legacy plain-text goal", async () => {
    const userId = await insertTestUser();
    await db.insert(financialGoal).values({
      userId,
      monthlyIncomeCents: 1_000_000,
      savedCents: 0,
      retirementAge: 60,
      annualRateBp: 800,
      withdrawalRateBp: 600,
    });
    expect(await goalsRepo.getSealed(userId)).toBeNull();
  });
});

describe("goalsRepo.upsertSealed", () => {
  it("stores the five ciphertexts and leaves every plain-text column NULL (including annual_rate_bp)", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsertSealed(userId, GOAL);

    const [row] = await rawRows(userId);
    expect(row).toMatchObject({
      monthlyIncomeCt: "v1:renda",
      savedCt: "v1:guardado",
      retirementAgeCt: "v1:idade",
      annualRateCt: "v1:retorno",
      withdrawalRateCt: "v1:retirada",
    });
    expect(row.monthlyIncomeCt!.startsWith("v1:")).toBe(true);
    expect(row.monthlyIncomeCents).toBeNull();
    expect(row.savedCents).toBeNull();
    expect(row.retirementAge).toBeNull();
    expect(row.annualRateBp).toBeNull();
    expect(row.withdrawalRateBp).toBeNull();
  });

  it("creates and then replaces the single row of the user", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsertSealed(userId, GOAL);
    const replaced: GoalDto = {
      monthlyIncomeCt: "v1:renda2",
      savedCt: "v1:guardado2",
      retirementAgeCt: "v1:idade2",
      annualRateCt: "v1:retorno2",
      withdrawalRateCt: "v1:retirada2",
    };
    await goalsRepo.upsertSealed(userId, replaced);

    expect(await rawRows(userId)).toHaveLength(1);
    expect(await goalsRepo.getSealed(userId)).toEqual(replaced);
  });

  it("keeps the goals of different users apart", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    await goalsRepo.upsertSealed(userId, GOAL);
    await goalsRepo.upsertSealed(otherId, { ...GOAL, savedCt: "v1:outro" });

    expect((await goalsRepo.getSealed(userId))!.savedCt).toBe("v1:guardado");
    expect((await goalsRepo.getSealed(otherId))!.savedCt).toBe("v1:outro");
  });

  it("converts a legacy plain-text goal into a sealed one", async () => {
    const userId = await insertTestUser();
    await db.insert(financialGoal).values({
      userId,
      monthlyIncomeCents: 1_000_000,
      savedCents: 0,
      retirementAge: 60,
      annualRateBp: 800,
      withdrawalRateBp: 600,
    });
    await goalsRepo.upsertSealed(userId, GOAL);

    const [row] = await rawRows(userId);
    expect(row.monthlyIncomeCents).toBeNull();
    expect(row.annualRateBp).toBeNull();
    expect(await goalsRepo.getSealed(userId)).toEqual(GOAL);
  });
});
