import { eq, sql } from "drizzle-orm";
import { type Goal, PRESET_RATES } from "@/lib/domain/freedom";
import { db } from "../client";
import { financialGoal } from "../schema";

export const goalsRepo = {
  /** The user's goal, or `null` when none was saved. */
  async get(userId: string): Promise<Goal | null> {
    const [row] = await db
      .select({
        monthlyIncomeCents: financialGoal.monthlyIncomeCents,
        savedCents: financialGoal.savedCents,
        birthDate: financialGoal.birthDate,
        retirementAge: financialGoal.retirementAge,
        annualRateBp: financialGoal.annualRateBp,
      })
      .from(financialGoal)
      .where(eq(financialGoal.userId, userId));
    if (!row) return null;
    // The CHECK on the column keeps the rate within the presets, so the lookup always finds one.
    const preset = PRESET_RATES.find((p) => p.annualBp === row.annualRateBp)!;
    return { ...row, withdrawalRateBp: preset.withdrawalBp };
  },

  /** Saves the user's goal, replacing the previous one (one row per user). */
  async upsert(userId: string, goal: Goal): Promise<void> {
    // The withdrawal rate follows from the preset until the table stores it.
    const { monthlyIncomeCents, savedCents, birthDate, retirementAge, annualRateBp } = goal;
    const row = { monthlyIncomeCents, savedCents, birthDate, retirementAge, annualRateBp };
    await db
      .insert(financialGoal)
      .values({ userId, ...row })
      .onConflictDoUpdate({
        target: financialGoal.userId,
        set: { ...row, updatedAt: sql`clock_timestamp()` },
      });
  },
};
