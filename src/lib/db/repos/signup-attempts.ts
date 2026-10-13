import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../client";
import { signupAttempt } from "../schema";

/** Signup instants of the IP hash at or after `since`, oldest first. */
async function recentSince(ipHash: string, since: Date): Promise<Date[]> {
  const rows = await db
    .select({ at: signupAttempt.attemptedAt })
    .from(signupAttempt)
    .where(and(eq(signupAttempt.ipHash, ipHash), gte(signupAttempt.attemptedAt, since)))
    .orderBy(asc(signupAttempt.attemptedAt));
  return rows.map((row) => row.at);
}

export const signupAttemptsRepo = { recentSince };
