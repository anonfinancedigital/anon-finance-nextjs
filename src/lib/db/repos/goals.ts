import { eq, sql } from "drizzle-orm";
import { user } from "../auth-schema";
import type { Goal } from "@/lib/domain/freedom";
import { db } from "../client";
import { financialGoal } from "../schema";

export const goalsRepo = {
  /** The user's goal, or `null` when none was saved or the user has no birth date. */
  async get(userId: string): Promise<Goal | null> {
    const [row] = await db
      .select({
        monthlyIncomeCents: financialGoal.monthlyIncomeCents,
        savedCents: financialGoal.savedCents,
        birthDate: user.birthDate,
        retirementAge: financialGoal.retirementAge,
        annualRateBp: financialGoal.annualRateBp,
        withdrawalRateBp: financialGoal.withdrawalRateBp,
      })
      .from(financialGoal)
      .innerJoin(user, eq(user.id, financialGoal.userId))
      .where(eq(financialGoal.userId, userId));
    if (!row || row.birthDate === null) return null;
    return { ...row, birthDate: row.birthDate };
  },

  /** Saves the user's goal, replacing the previous one (one row per user). */
  async upsert(userId: string, goal: Omit<Goal, "birthDate">): Promise<void> {
    await db
      .insert(financialGoal)
      .values({ userId, ...goal })
      .onConflictDoUpdate({
        target: financialGoal.userId,
        set: { ...goal, updatedAt: sql`clock_timestamp()` },
      });
  },
};
