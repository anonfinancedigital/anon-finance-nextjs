import { eq, sql } from "drizzle-orm";
import type { AnnualRateBp, Goal } from "@/lib/domain/freedom";
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
    // The CHECK on the column keeps the rate within AnnualRateBp.
    return row ? { ...row, annualRateBp: row.annualRateBp as AnnualRateBp } : null;
  },

  /** Saves the user's goal, replacing the previous one (one row per user). */
  async upsert(userId: string, goal: Goal): Promise<void> {
    await db
      .insert(financialGoal)
      .values({ userId, ...goal })
      .onConflictDoUpdate({
        target: financialGoal.userId,
        set: { ...goal, updatedAt: sql`clock_timestamp()` },
      });
  },
};
