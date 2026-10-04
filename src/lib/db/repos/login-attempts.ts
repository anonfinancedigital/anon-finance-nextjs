import { and, eq, gte, min } from "drizzle-orm";
import { db } from "../client";
import { loginAttempt } from "../schema";

const normalize = (email: string) => email.trim().toLowerCase();

/** Failed sign-ins of the e-mail (any case) since the given instant. */
async function countRecentFailures(email: string, since: Date): Promise<number> {
  return db.$count(
    loginAttempt,
    and(eq(loginAttempt.email, normalize(email)), gte(loginAttempt.attemptedAt, since)),
  );
}

/** When the oldest failure of the e-mail since the given instant happened, or null if none. */
async function oldestRecentFailure(email: string, since: Date): Promise<Date | null> {
  const [row] = await db
    .select({ at: min(loginAttempt.attemptedAt) })
    .from(loginAttempt)
    .where(and(eq(loginAttempt.email, normalize(email)), gte(loginAttempt.attemptedAt, since)));
  return row?.at ?? null;
}

/** Stamped with the app clock (not the DB's), so the lockout window follows `Date.now()`. */
async function recordFailure(email: string): Promise<void> {
  await db.insert(loginAttempt).values({ email: normalize(email), attemptedAt: new Date() });
}

async function clear(email: string): Promise<void> {
  await db.delete(loginAttempt).where(eq(loginAttempt.email, normalize(email)));
}

export const loginAttemptsRepo = { countRecentFailures, oldestRecentFailure, recordFailure, clear };
