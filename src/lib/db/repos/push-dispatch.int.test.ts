import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { TransactionDto } from "@/lib/vault/types";
import { insertCategory, insertTestUser, setupTestDb } from "@/test/db";
import { user } from "../auth-schema";
import { db } from "../client";
import { pushBroadcast, pushDispatch, pushPreference, pushSubscription } from "../schema";
import { pushDispatchRepo } from "./push-dispatch";
import { transactionsRepo } from "./transactions";

setupTestDb();

const TODAY = "2026-10-15";

type Prefs = { reminder?: boolean; due?: boolean; security?: boolean; admin?: boolean; hour?: number };

/** A user with the given status, `devices` subscriptions and (unless `prefs` is null) a preferences row. */
async function pushUser(
  opts: { status?: "approved" | "pending" | "revoked"; devices?: number; prefs?: Prefs | null } = {},
) {
  const { status = "approved", devices = 1, prefs = {} } = opts;
  const userId = await insertTestUser();
  await db.update(user).set({ status }).where(eq(user.id, userId));
  const endpoints: string[] = [];
  for (let i = 0; i < devices; i++) {
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    endpoints.push(endpoint);
    await db.insert(pushSubscription).values({ userId, endpoint, p256dh: `p-${i}`, auth: `a-${i}` });
  }
  if (prefs !== null) await db.insert(pushPreference).values({ userId, ...prefs });
  return { userId, endpoints: endpoints.sort() };
}

const ids = (candidates: { userId: string }[]) => candidates.map((c) => c.userId).sort();
const endpointsOf = (candidate: { subs: { endpoint: string }[] }) => candidate.subs.map((s) => s.endpoint).sort();

/** A recurring expense series for `userId` starting on `date`, optionally ending in `endMonth`. */
async function series(userId: string, date: string, endMonth?: string) {
  const categoryId = (await insertCategory(userId, { name: randomUUID(), percentMicro: 1000000, color: 1 })).id;
  const dto: TransactionDto = {
    id: randomUUID(),
    kind: "expense",
    date,
    categoryId,
    subcategoryId: null,
    amountCt: "v1:a1000",
    descriptionCt: null,
    recurrence: endMonth ? "until" : "indefinite",
    recurrenceEndMonth: endMonth,
  };
  await transactionsRepo.createSealed(userId, dto);
}

describe("pushDispatchRepo.reminderCandidates", () => {
  it("lists only approved users with a subscription, with every subscription (PUSH-23, PUSH-24)", async () => {
    const approved = await pushUser({ devices: 2, prefs: { reminder: true, hour: 9 } });
    await pushUser({ status: "revoked", prefs: { reminder: true, hour: 9 } });
    await pushUser({ status: "pending", prefs: { reminder: true, hour: 9 } });
    await pushUser({ devices: 0, prefs: { reminder: true, hour: 9 } });

    const candidates = await pushDispatchRepo.reminderCandidates(TODAY, 12);

    expect(ids(candidates)).toEqual([approved.userId]);
    expect(endpointsOf(candidates[0])).toEqual(approved.endpoints);
    expect(candidates[0].subs.map((s) => [s.p256dh, s.auth]).sort()).toEqual([
      ["p-0", "a-0"],
      ["p-1", "a-1"],
    ]);
  });

  it("leaves out users with the reminder off or without preferences", async () => {
    await pushUser({ prefs: { reminder: false, hour: 9 } });
    await pushUser({ prefs: null });

    expect(await pushDispatchRepo.reminderCandidates(TODAY, 12)).toEqual([]);
  });

  it("leaves the user out before the preferred hour and includes it at and after it (PUSH-24)", async () => {
    const { userId } = await pushUser({ prefs: { reminder: true, hour: 9 } });

    expect(await pushDispatchRepo.reminderCandidates(TODAY, 8)).toEqual([]);
    expect(ids(await pushDispatchRepo.reminderCandidates(TODAY, 9))).toEqual([userId]);
    expect(ids(await pushDispatchRepo.reminderCandidates(TODAY, 23))).toEqual([userId]);
  });

  it("leaves out a user already claimed for the day, but not for another day (PUSH-26)", async () => {
    const { userId } = await pushUser({ prefs: { reminder: true, hour: 9 } });
    await pushDispatchRepo.claim(userId, "reminder", TODAY);

    expect(await pushDispatchRepo.reminderCandidates(TODAY, 12)).toEqual([]);
    expect(ids(await pushDispatchRepo.reminderCandidates("2026-10-16", 12))).toEqual([userId]);
  });
});

describe("pushDispatchRepo.dueCandidates", () => {
  it("includes a user with an active series occurring today (PUSH-25)", async () => {
    const { userId, endpoints } = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(userId, "2026-08-15");

    const candidates = await pushDispatchRepo.dueCandidates(TODAY, 9);

    expect(ids(candidates)).toEqual([userId]);
    expect(endpointsOf(candidates[0])).toEqual(endpoints);
  });

  it("leaves out an ended series, a future series and a series on another day (PUSH-25)", async () => {
    const ended = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(ended.userId, "2026-05-15", "2026-09");
    const future = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(future.userId, "2026-11-15");
    const otherDay = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(otherDay.userId, "2026-08-16");

    expect(await pushDispatchRepo.dueCandidates(TODAY, 12)).toEqual([]);
  });

  it("leaves out a one-off transaction dated today", async () => {
    const { userId } = await pushUser({ prefs: { due: true, hour: 9 } });
    const categoryId = (await insertCategory(userId, { name: "Única", percentMicro: 1000000, color: 1 })).id;
    await transactionsRepo.createSealed(userId, {
      id: randomUUID(),
      kind: "expense",
      date: TODAY,
      categoryId,
      subcategoryId: null,
      amountCt: "v1:a1000",
      descriptionCt: null,
      recurrence: "none",
    });

    expect(await pushDispatchRepo.dueCandidates(TODAY, 12)).toEqual([]);
  });

  it("projects day 31 onto the last day of a short month (AD-004)", async () => {
    const { userId } = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(userId, "2026-10-31");

    expect(ids(await pushDispatchRepo.dueCandidates("2026-11-30", 12))).toEqual([userId]);
    expect(await pushDispatchRepo.dueCandidates("2026-11-29", 12)).toEqual([]);
  });

  it("makes one candidate of a user with two series on the same day (edge case)", async () => {
    const { userId } = await pushUser({ prefs: { due: true, hour: 9 } });
    await series(userId, "2026-08-15");
    await series(userId, "2026-09-15");

    expect(ids(await pushDispatchRepo.dueCandidates(TODAY, 12))).toEqual([userId]);
  });

  it("applies the hour, the due switch, the status and the claim like the reminder (PUSH-23, PUSH-26)", async () => {
    const early = await pushUser({ prefs: { due: true, hour: 13 } });
    const off = await pushUser({ prefs: { due: false, reminder: true, hour: 9 } });
    const revoked = await pushUser({ status: "revoked", prefs: { due: true, hour: 9 } });
    const claimed = await pushUser({ prefs: { due: true, hour: 9 } });
    for (const u of [early, off, revoked, claimed]) await series(u.userId, "2026-08-15");
    await pushDispatchRepo.claim(claimed.userId, "due", TODAY);

    expect(await pushDispatchRepo.dueCandidates(TODAY, 12)).toEqual([]);
  });
});

describe("pushDispatchRepo.claim", () => {
  it("answers true the first time and false afterwards (PUSH-26)", async () => {
    const { userId } = await pushUser();

    expect(await pushDispatchRepo.claim(userId, "reminder", TODAY)).toBe(true);
    expect(await pushDispatchRepo.claim(userId, "reminder", TODAY)).toBe(false);
    expect(await pushDispatchRepo.claim(userId, "due", TODAY)).toBe(true);
  });

  it("answers true exactly once under concurrent calls (PUSH-26)", async () => {
    const { userId } = await pushUser();

    const results = await Promise.all(
      Array.from({ length: 8 }, () => pushDispatchRepo.claim(userId, "reminder", TODAY)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.select().from(pushDispatch).where(eq(pushDispatch.userId, userId))).toHaveLength(1);
  });
});

describe("pushDispatchRepo broadcasts", () => {
  it("enqueues the text, unsent (PUSH-37)", async () => {
    await pushDispatchRepo.enqueueBroadcast("Manutenção às 22h");

    expect(await db.select().from(pushBroadcast)).toEqual([
      expect.objectContaining({ text: "Manutenção às 22h", sentAt: null }),
    ]);
  });

  it("targets only approved subscribed users with admin on, without a claim (PUSH-40)", async () => {
    const adminOn = await pushUser({ devices: 2, prefs: { admin: true } });
    const claimed = await pushUser({ prefs: { admin: true } });
    await pushUser({ prefs: { admin: false } });
    await pushUser({ status: "revoked", prefs: { admin: true } });
    await pushUser({ devices: 0, prefs: { admin: true } });
    await pushDispatchRepo.enqueueBroadcast("Aviso");
    const [{ id }] = await db.select().from(pushBroadcast);
    await pushDispatchRepo.claim(claimed.userId, "broadcast", id);

    const pending = await pushDispatchRepo.broadcastCandidates();

    expect(pending).toHaveLength(1);
    expect(pending[0].broadcast).toEqual({ id, text: "Aviso" });
    expect(ids(pending[0].targets)).toEqual([adminOn.userId]);
    expect(endpointsOf(pending[0].targets[0])).toEqual(adminOn.endpoints);
  });

  it("lists a broadcast with no target left, and none once marked sent (PUSH-41)", async () => {
    await pushDispatchRepo.enqueueBroadcast("Aviso");
    const [{ id }] = await db.select().from(pushBroadcast);

    expect(await pushDispatchRepo.broadcastCandidates()).toEqual([{ broadcast: { id, text: "Aviso" }, targets: [] }]);

    await pushDispatchRepo.markBroadcastSent(id);

    const [row] = await db.select().from(pushBroadcast);
    expect(row.sentAt).toBeInstanceOf(Date);
    expect(await pushDispatchRepo.broadcastCandidates()).toEqual([]);
  });
});

describe("pushDispatchRepo.prune", () => {
  it("deletes only rows older than the given instant (PUSH-31)", async () => {
    const { userId } = await pushUser();
    const now = new Date("2026-10-15T12:00:00Z");
    const day = 24 * 60 * 60 * 1000;
    await db.insert(pushDispatch).values([
      { userId, kind: "reminder", ref: "old", sentAt: new Date(now.getTime() - 8 * day) },
      { userId, kind: "reminder", ref: "recent", sentAt: new Date(now.getTime() - 6 * day) },
    ]);

    await pushDispatchRepo.prune(new Date(now.getTime() - 7 * day));

    expect((await db.select().from(pushDispatch)).map((r) => r.ref)).toEqual(["recent"]);
  });
});
