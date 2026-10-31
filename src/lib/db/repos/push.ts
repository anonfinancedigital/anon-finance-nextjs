import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "../client";
import { pushPreference, pushSubscription } from "../schema";

/** Most browsers/devices a user may subscribe (PUSH-07). */
const MAX_DEVICES = 5;

export type StoredSub = { endpoint: string; p256dh: string; auth: string };

export type Prefs = { reminder: boolean; due: boolean; security: boolean; admin: boolean; hour: number };

const subColumns = {
  endpoint: pushSubscription.endpoint,
  p256dh: pushSubscription.p256dh,
  auth: pushSubscription.auth,
};

/**
 * Stores the subscription for the user and creates the default preferences when none exist. An endpoint
 * already stored (for anyone) gets the new keys and the caller as owner, without a second row. A sixth
 * device of the user is `limit` and nothing is written. The per-user advisory lock serializes concurrent
 * subscriptions of the same user, so the limit holds under concurrency.
 */
async function subscribe(userId: string, sub: StoredSub): Promise<"ok" | "limit"> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
    const [{ others }] = await tx
      .select({ others: count() })
      .from(pushSubscription)
      .where(and(eq(pushSubscription.userId, userId), ne(pushSubscription.endpoint, sub.endpoint)));
    if (others >= MAX_DEVICES) return "limit";

    await tx
      .insert(pushSubscription)
      .values({ userId, ...sub })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: { userId, p256dh: sub.p256dh, auth: sub.auth },
      });
    await tx.insert(pushPreference).values({ userId }).onConflictDoNothing();
    return "ok";
  });
}

/** Deletes the endpoint only when the user owns it. */
async function unsubscribe(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

/** Deletes the endpoint whatever its owner (the push service answered 404/410). */
async function removeByEndpoint(endpoint: string): Promise<void> {
  await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
}

/** How many devices the user has subscribed and the preferences, or `null` before the first one. */
async function settingsFor(userId: string): Promise<{ devices: number; prefs: Prefs | null }> {
  const devices = await db.$count(pushSubscription, eq(pushSubscription.userId, userId));
  const [prefs] = await db
    .select({
      reminder: pushPreference.reminder,
      due: pushPreference.due,
      security: pushPreference.security,
      admin: pushPreference.admin,
      hour: pushPreference.hour,
    })
    .from(pushPreference)
    .where(eq(pushPreference.userId, userId));
  return { devices, prefs: prefs ?? null };
}

/** Saves the preferences on the user's own row; `no_prefs` (nothing written) when there is none yet. */
async function updatePrefs(userId: string, prefs: Prefs): Promise<"ok" | "no_prefs"> {
  const rows = await db
    .update(pushPreference)
    .set({ ...prefs, updatedAt: new Date() })
    .where(eq(pushPreference.userId, userId))
    .returning({ userId: pushPreference.userId });
  return rows.length > 0 ? "ok" : "no_prefs";
}

/** Endpoint and keys of every subscription of the user. */
async function subscriptionsOf(userId: string): Promise<StoredSub[]> {
  return db.select(subColumns).from(pushSubscription).where(eq(pushSubscription.userId, userId));
}

/** The user's subscriptions when security notices are on; empty when off or without preferences. */
async function securityTargets(userId: string): Promise<StoredSub[]> {
  return db
    .select(subColumns)
    .from(pushSubscription)
    .innerJoin(pushPreference, eq(pushPreference.userId, pushSubscription.userId))
    .where(and(eq(pushSubscription.userId, userId), eq(pushPreference.security, true)));
}

export const pushRepo = {
  subscribe,
  unsubscribe,
  removeByEndpoint,
  settingsFor,
  updatePrefs,
  subscriptionsOf,
  securityTargets,
};
