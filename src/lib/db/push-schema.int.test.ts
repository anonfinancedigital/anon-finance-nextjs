import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { user } from "./auth-schema";
import { db } from "./client";
import { pushBroadcast, pushDispatch, pushPreference, pushSubscription } from "./schema";

setupTestDb();

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

/** Postgres SQLSTATE of a failed query (Drizzle wraps the driver error in `cause`). */
async function pgErrorCode(query: Promise<unknown>): Promise<string | undefined> {
  try {
    await query;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
  return undefined;
}

const sub = (userId: string, endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`) => ({
  userId,
  endpoint,
  p256dh: "p",
  auth: "a",
});

describe("push_preference (PUSH-15)", () => {
  it("defaults to reminder off, due off, security on, admin on, hour 9 (PUSH-03)", async () => {
    const userId = await insertTestUser();
    const [row] = await db.insert(pushPreference).values({ userId }).returning();
    expect(row).toMatchObject({ reminder: false, due: false, security: true, admin: true, hour: 9 });
  });

  it.each([-1, 24])("rejects hour %i", async (hour) => {
    const userId = await insertTestUser();
    expect(await pgErrorCode(db.insert(pushPreference).values({ userId, hour }))).toBe(CHECK_VIOLATION);
  });

  it.each([0, 23])("accepts hour %i", async (hour) => {
    const userId = await insertTestUser();
    await db.insert(pushPreference).values({ userId, hour });
    const [row] = await db.select().from(pushPreference).where(eq(pushPreference.userId, userId));
    expect(row.hour).toBe(hour);
  });

  it("keeps one row per user", async () => {
    const userId = await insertTestUser();
    await db.insert(pushPreference).values({ userId });
    expect(await pgErrorCode(db.insert(pushPreference).values({ userId }))).toBe(UNIQUE_VIOLATION);
  });
});

describe("push_broadcast (PUSH-37)", () => {
  it.each([1, 140])("accepts a text of %i characters", async (length) => {
    const [row] = await db.insert(pushBroadcast).values({ text: "a".repeat(length) }).returning();
    expect(row.sentAt).toBeNull();
  });

  it.each([0, 141])("rejects a text of %i characters", async (length) => {
    expect(await pgErrorCode(db.insert(pushBroadcast).values({ text: "a".repeat(length) }))).toBe(CHECK_VIOLATION);
  });
});

describe("push_subscription (PUSH-03)", () => {
  it("rejects a duplicate endpoint", async () => {
    const userId = await insertTestUser();
    const other = await insertTestUser();
    const row = sub(userId);
    await db.insert(pushSubscription).values(row);
    expect(await pgErrorCode(db.insert(pushSubscription).values({ ...row, userId: other }))).toBe(UNIQUE_VIOLATION);
  });
});

describe("push_dispatch (PUSH-26)", () => {
  it("rejects a second row for the same (user, kind, ref)", async () => {
    const userId = await insertTestUser();
    const row = { userId, kind: "reminder", ref: "2026-10-31" };
    await db.insert(pushDispatch).values(row);
    expect(await pgErrorCode(db.insert(pushDispatch).values(row))).toBe(UNIQUE_VIOLATION);
  });

  it("allows the same user and kind on another ref, and the same ref on another kind", async () => {
    const userId = await insertTestUser();
    await db.insert(pushDispatch).values([
      { userId, kind: "reminder", ref: "2026-10-31" },
      { userId, kind: "reminder", ref: "2026-11-01" },
      { userId, kind: "due", ref: "2026-10-31" },
    ]);
    expect(await db.select().from(pushDispatch).where(eq(pushDispatch.userId, userId))).toHaveLength(3);
  });

  it("rejects an unknown kind", async () => {
    const userId = await insertTestUser();
    expect(await pgErrorCode(db.insert(pushDispatch).values({ userId, kind: "spam", ref: "x" }))).toBe(
      CHECK_VIOLATION,
    );
  });
});

describe("account deletion (PUSH-11)", () => {
  it("deletes subscriptions, preferences and dispatch records of the user, and only theirs", async () => {
    const userId = await insertTestUser();
    const other = await insertTestUser();
    for (const id of [userId, other]) {
      await db.insert(pushSubscription).values(sub(id));
      await db.insert(pushPreference).values({ userId: id });
      await db.insert(pushDispatch).values({ userId: id, kind: "reminder", ref: "2026-10-31" });
    }

    await db.delete(user).where(eq(user.id, userId));

    expect(await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId))).toHaveLength(0);
    expect(await db.select().from(pushPreference).where(eq(pushPreference.userId, userId))).toHaveLength(0);
    expect(await db.select().from(pushDispatch).where(eq(pushDispatch.userId, userId))).toHaveLength(0);
    expect(await db.select().from(pushSubscription).where(eq(pushSubscription.userId, other))).toHaveLength(1);
    expect(await db.select().from(pushPreference).where(eq(pushPreference.userId, other))).toHaveLength(1);
    expect(await db.select().from(pushDispatch).where(eq(pushDispatch.userId, other))).toHaveLength(1);
  });
});
