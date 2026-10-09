import { eq, sql } from "drizzle-orm";
import { user } from "../auth-schema";
import type { Goal } from "@/lib/domain/freedom";
import type { GoalDto } from "@/lib/vault/types";
import { db } from "../client";
import { financialGoal, plain } from "../schema";

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
    return {
      birthDate: row.birthDate,
      monthlyIncomeCents: plain(row.monthlyIncomeCents, "financial_goal.monthly_income_cents"),
      savedCents: plain(row.savedCents, "financial_goal.saved_cents"),
      retirementAge: plain(row.retirementAge, "financial_goal.retirement_age"),
      annualRateBp: plain(row.annualRateBp, "financial_goal.annual_rate_bp"),
      withdrawalRateBp: plain(row.withdrawalRateBp, "financial_goal.withdrawal_rate_bp"),
    };
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
