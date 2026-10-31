import { and, asc, eq, isNull, lt, lte, notExists, sql, type SQL } from "drizzle-orm";
import { monthKey, type Segment } from "@/lib/domain/recurrence";
import { monthRange } from "@/lib/domain/month";
import { hasOccurrenceOn } from "@/lib/domain/push-schedule";
import { user } from "../auth-schema";
import { db } from "../client";
import { pushBroadcast, pushDispatch, pushPreference, pushSubscription, transaction } from "../schema";
import type { StoredSub } from "./push";
import { applicableInMonth } from "./transactions";

export type DispatchKind = "reminder" | "due" | "broadcast";

/** A user to notify and every subscription of that user. */
export type Candidate = { userId: string; subs: StoredSub[] };

export type Broadcast = { id: string; text: string };

/**
 * Subscriptions of approved users whose preferences pass `prefFilter` and who have no `push_dispatch`
 * row for (kind, ref) yet, grouped by user (PUSH-23, PUSH-26).
 */
async function candidates(prefFilter: SQL | undefined, kind: DispatchKind, ref: string): Promise<Candidate[]> {
  const rows = await db
    .select({
      userId: pushSubscription.userId,
      endpoint: pushSubscription.endpoint,
      p256dh: pushSubscription.p256dh,
      auth: pushSubscription.auth,
    })
    .from(pushSubscription)
    .innerJoin(user, eq(user.id, pushSubscription.userId))
    .innerJoin(pushPreference, eq(pushPreference.userId, pushSubscription.userId))
    .where(
      and(
        eq(user.status, "approved"),
        prefFilter,
        notExists(
          db
            .select({ one: sql`1` })
            .from(pushDispatch)
            .where(
              and(
                eq(pushDispatch.userId, pushSubscription.userId),
                eq(pushDispatch.kind, kind),
                eq(pushDispatch.ref, ref),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(pushSubscription.userId), asc(pushSubscription.createdAt));

  const byUser = new Map<string, StoredSub[]>();
  for (const { userId, ...sub } of rows) byUser.set(userId, [...(byUser.get(userId) ?? []), sub]);
  return [...byUser].map(([userId, subs]) => ({ userId, subs }));
}

/** Users with the daily reminder on whose preferred hour has come (PUSH-24). `date` is the local AAAA-MM-DD. */
async function reminderCandidates(date: string, hour: number): Promise<Candidate[]> {
  return candidates(and(eq(pushPreference.reminder, true), lte(pushPreference.hour, hour)), "reminder", date);
}

/** Recurring segments of the user with an occurrence in the month of `date`, filtered by AD-004 in SQL. */
async function recurringSegmentsIn(userId: string, date: string): Promise<Segment[]> {
  const key = monthKey(date);
  const rows = await db
    .select({
      id: transaction.id,
      seriesId: transaction.seriesId,
      date: transaction.date,
      recurrenceDay: transaction.recurrenceDay,
      recurrenceEnd: transaction.recurrenceEnd,
    })
    .from(transaction)
    .where(
      and(
        applicableInMonth(userId, monthRange({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) })),
        eq(transaction.recurring, true),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    seriesId: r.seriesId,
    date: r.date,
    recurringDay: r.recurrenceDay,
    endMonth: r.recurrenceEnd === null ? null : monthKey(r.recurrenceEnd),
  }));
}

/**
 * Users with the due notice on whose preferred hour has come and who have at least one recurring series
 * occurring on `date`; one candidate per user however many series fall on the day (PUSH-25).
 */
async function dueCandidates(date: string, hour: number): Promise<Candidate[]> {
  const eligible = await candidates(and(eq(pushPreference.due, true), lte(pushPreference.hour, hour)), "due", date);
  const due: Candidate[] = [];
  for (const candidate of eligible) {
    if (hasOccurrenceOn(await recurringSegmentsIn(candidate.userId, date), date)) due.push(candidate);
  }
  return due;
}

/** Unsent broadcasts, oldest first, each with the users still to receive it (PUSH-40). */
async function broadcastCandidates(): Promise<{ broadcast: Broadcast; targets: Candidate[] }[]> {
  const pending = await db
    .select({ id: pushBroadcast.id, text: pushBroadcast.text })
    .from(pushBroadcast)
    .where(isNull(pushBroadcast.sentAt))
    .orderBy(asc(pushBroadcast.createdAt));
  const result: { broadcast: Broadcast; targets: Candidate[] }[] = [];
  for (const broadcast of pending) {
    result.push({ broadcast, targets: await candidates(eq(pushPreference.admin, true), "broadcast", broadcast.id) });
  }
  return result;
}

/** Records (user, kind, ref) as sent; `true` only for the call that inserted the row (PUSH-26). */
async function claim(userId: string, kind: DispatchKind, ref: string): Promise<boolean> {
  const rows = await db
    .insert(pushDispatch)
    .values({ userId, kind, ref })
    .onConflictDoNothing()
    .returning({ userId: pushDispatch.userId });
  return rows.length > 0;
}

/** Queues an administrator message for the next dispatch run (PUSH-37). */
async function enqueueBroadcast(text: string): Promise<void> {
  await db.insert(pushBroadcast).values({ text });
}

/** Marks the broadcast delivered to everyone eligible (PUSH-41). */
async function markBroadcastSent(id: string): Promise<void> {
  await db.update(pushBroadcast).set({ sentAt: new Date() }).where(eq(pushBroadcast.id, id));
}

/** Deletes dispatch records sent before `olderThan` (PUSH-31). */
async function prune(olderThan: Date): Promise<void> {
  await db.delete(pushDispatch).where(lt(pushDispatch.sentAt, olderThan));
}

export const pushDispatchRepo = {
  reminderCandidates,
  dueCandidates,
  broadcastCandidates,
  claim,
  enqueueBroadcast,
  markBroadcastSent,
  prune,
};
