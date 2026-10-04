import { and, eq, gte, max } from "drizzle-orm";
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

/** When the most recent failure of the e-mail (any case) happened, or null if none. */
async function latestFailure(email: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: max(loginAttempt.attemptedAt) })
    .from(loginAttempt)
    .where(eq(loginAttempt.email, normalize(email)));
  return row?.at ?? null;
}

/** Stamped with the app clock (not the DB's), so the lockout window follows `Date.now()`. */
async function recordFailure(email: string): Promise<void> {
  await db.insert(loginAttempt).values({ email: normalize(email), attemptedAt: new Date() });
}

async function clear(email: string): Promise<void> {
  await db.delete(loginAttempt).where(eq(loginAttempt.email, normalize(email)));
}

export const loginAttemptsRepo = { countRecentFailures, latestFailure, recordFailure, clear };
