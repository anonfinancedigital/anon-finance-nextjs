import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { categoryPercent, financialGoal, subcategory, transaction } from "@/lib/db/schema";
import { insertCredentialUser } from "./auth";
import { insertCategory } from "./db";

/**
 * A legacy account (credential user, no vault) with plain-text rows: category "Moradia" (two percent
 * versions, one subcategory), category "Antiga", a single expense, a series income ending 2026-12,
 * a goal and a birth date.
 */
export async function insertLegacyAccount(email = `${randomUUID()}@x.com`, password?: string) {
  const userId = await insertCredentialUser(email, password);
  await db.update(user).set({ birthDate: "1990-05-17" }).where(eq(user.id, userId));
  const cat = await insertCategory(userId, { name: "Moradia", percentMicro: 30_000_000, color: 2 });
  await db
    .insert(categoryPercent)
    .values({ categoryId: cat.id, fromMonth: "2026-06-01", percentMicro: 35_000_000 });
  const gone = await insertCategory(userId, { name: "Antiga", percentMicro: 10_000_000, color: 4 });
  const [sub] = await db.insert(subcategory).values({ userId, categoryId: cat.id, name: "Aluguel" }).returning();
  const expenseId = randomUUID();
  const seriesId = randomUUID();
  await db.insert(transaction).values({
    id: expenseId,
    userId,
    kind: "expense",
    amountCents: 12345,
    date: "2026-10-05",
    categoryId: cat.id,
    subcategoryId: sub.id,
    description: "Mercado",
  });
  await db.insert(transaction).values({
    id: seriesId,
    userId,
    kind: "income",
    amountCents: 500000,
    date: "2026-01-31",
    recurring: true,
    recurrenceDay: 31,
    recurrenceEnd: "2026-12-01",
    seriesId,
  });
  await db.insert(financialGoal).values({
    userId,
    monthlyIncomeCents: 1_000_000,
    savedCents: 50_000,
    retirementAge: 60,
    annualRateBp: 800,
    withdrawalRateBp: 600,
  });
  return { userId, email, cat, gone, sub, expenseId, seriesId };
}
