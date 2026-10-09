import { eq, sql } from "drizzle-orm";
import type { GoalDto } from "@/lib/vault/types";
import { db } from "../client";
import { financialGoal } from "../schema";

export const goalsRepo = {
  /** The sealed goal, or `null` when the user has none (or a legacy plain-text one). */
  async getSealed(userId: string): Promise<GoalDto | null> {
    const [row] = await db
      .select({
        monthlyIncomeCt: financialGoal.monthlyIncomeCt,
        savedCt: financialGoal.savedCt,
        retirementAgeCt: financialGoal.retirementAgeCt,
        annualRateCt: financialGoal.annualRateCt,
        withdrawalRateCt: financialGoal.withdrawalRateCt,
      })
      .from(financialGoal)
      .where(eq(financialGoal.userId, userId));
    if (!row) return null;
    const { monthlyIncomeCt, savedCt, retirementAgeCt, annualRateCt, withdrawalRateCt } = row;
    if (!monthlyIncomeCt || !savedCt || !retirementAgeCt || !annualRateCt || !withdrawalRateCt) {
      return null;
    }
    return { monthlyIncomeCt, savedCt, retirementAgeCt, annualRateCt, withdrawalRateCt };
  },

  /** Saves the sealed goal, replacing the previous one (one row per user); plain columns become NULL. */
  async upsertSealed(userId: string, dto: GoalDto): Promise<void> {
    // `annual_rate_bp` has a database default of 800: it must be written as an explicit NULL.
    const plainCleared = {
      monthlyIncomeCents: null,
      savedCents: null,
      retirementAge: null,
      annualRateBp: null,
      withdrawalRateBp: null,
    };
    const values = { ...plainCleared, ...dto };
    await db
      .insert(financialGoal)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: financialGoal.userId,
        set: { ...values, updatedAt: sql`clock_timestamp()` },
      });
  },
};
