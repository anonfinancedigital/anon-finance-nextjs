import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { pushPreference, pushSubscription } from "../schema";
import { pushRepo } from "./push";

setupTestDb();

const endpoint = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
const sub = (ep = endpoint(), p256dh = "p-1", auth = "a-1") => ({ endpoint: ep, p256dh, auth });

const DEFAULTS = { reminder: false, due: false, security: true, admin: true, hour: 9 };

const rowsOf = (userId: string) => db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
const allRows = () => db.select().from(pushSubscription);

describe("pushRepo.subscribe", () => {
  it("stores the subscription and creates preferences with the spec defaults (PUSH-03)", async () => {
    const userId = await insertTestUser();
    const s = sub();

    expect(await pushRepo.subscribe(userId, s)).toBe("ok");

    expect(await rowsOf(userId)).toEqual([
      expect.objectContaining({ userId, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }),
    ]);
    const [prefs] = await db.select().from(pushPreference).where(eq(pushPreference.userId, userId));
    expect(prefs).toMatchObject(DEFAULTS);
  });

  it("keeps existing preferences when another device subscribes", async () => {
    const userId = await insertTestUser();
    await pushRepo.subscribe(userId, sub());
    await pushRepo.updatePrefs(userId, { reminder: true, due: true, security: false, admin: false, hour: 21 });

    expect(await pushRepo.subscribe(userId, sub())).toBe("ok");

    expect((await pushRepo.settingsFor(userId)).prefs).toEqual({
      reminder: true,
      due: true,
      security: false,
      admin: false,
      hour: 21,
    });
  });

  it("accepts a fifth subscription and answers limit for the sixth, storing nothing (PUSH-07)", async () => {
    const userId = await insertTestUser();
    for (let i = 0; i < 5; i++) expect(await pushRepo.subscribe(userId, sub())).toBe("ok");
    const sixth = sub();

    expect(await pushRepo.subscribe(userId, sixth)).toBe("limit");

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.endpoint)).not.toContain(sixth.endpoint);
  });

  it("updates the keys of an endpoint already stored without a second row, even at the limit (PUSH-08)", async () => {
    const userId = await insertTestUser();
    const same = endpoint();
    await pushRepo.subscribe(userId, sub(same, "p-old", "a-old"));
    for (let i = 0; i < 4; i++) await pushRepo.subscribe(userId, sub());

    expect(await pushRepo.subscribe(userId, sub(same, "p-new", "a-new"))).toBe("ok");

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(5);
    expect(rows.find((r) => r.endpoint === same)).toMatchObject({ p256dh: "p-new", auth: "a-new" });
  });

  it("moves an endpoint stored for another user to the caller, with the new keys (PUSH-08)", async () => {
    const previous = await insertTestUser();
    const caller = await insertTestUser();
    const same = endpoint();
    await pushRepo.subscribe(previous, sub(same, "p-old", "a-old"));

    expect(await pushRepo.subscribe(caller, sub(same, "p-new", "a-new"))).toBe("ok");

    expect(await allRows()).toEqual([
      expect.objectContaining({ userId: caller, endpoint: same, p256dh: "p-new", auth: "a-new" }),
    ]);
  });

  it("refuses to move another user's endpoint to a caller that already has 5 (PUSH-07)", async () => {
    const previous = await insertTestUser();
    const caller = await insertTestUser();
    const same = endpoint();
    await pushRepo.subscribe(previous, sub(same));
    for (let i = 0; i < 5; i++) await pushRepo.subscribe(caller, sub());

    expect(await pushRepo.subscribe(caller, sub(same, "p-new", "a-new"))).toBe("limit");

    expect(await rowsOf(previous)).toEqual([expect.objectContaining({ endpoint: same, p256dh: "p-1" })]);
    expect(await rowsOf(caller)).toHaveLength(5);
  });

  it("never stores more than 5 for a user under concurrent subscriptions (PUSH-07)", async () => {
    const userId = await insertTestUser();

    const results = await Promise.all(Array.from({ length: 9 }, () => pushRepo.subscribe(userId, sub())));

    expect(results.filter((r) => r === "ok")).toHaveLength(5);
    expect(results.filter((r) => r === "limit")).toHaveLength(4);
    expect(await rowsOf(userId)).toHaveLength(5);
    expect(await db.select().from(pushPreference)).toHaveLength(1);
  });
});

describe("pushRepo.unsubscribe", () => {
  it("deletes only the caller's row with that endpoint (PUSH-09)", async () => {
    const owner = await insertTestUser();
    const other = await insertTestUser();
    const mine = sub();
    const kept = sub();
    await pushRepo.subscribe(owner, mine);
    await pushRepo.subscribe(owner, kept);

    await pushRepo.unsubscribe(other, mine.endpoint);
    expect(await rowsOf(owner)).toHaveLength(2);

    await pushRepo.unsubscribe(owner, mine.endpoint);
    expect((await rowsOf(owner)).map((r) => r.endpoint)).toEqual([kept.endpoint]);
  });
});

describe("pushRepo.removeByEndpoint", () => {
  it("deletes the endpoint whatever its owner", async () => {
    const owner = await insertTestUser();
    const gone = sub();
    const kept = sub();
    await pushRepo.subscribe(owner, gone);
    await pushRepo.subscribe(owner, kept);

    await pushRepo.removeByEndpoint(gone.endpoint);

    expect((await allRows()).map((r) => r.endpoint)).toEqual([kept.endpoint]);
  });
});

describe("pushRepo.settingsFor", () => {
  it("returns zero devices and no preferences for a user who never subscribed", async () => {
    const userId = await insertTestUser();
    expect(await pushRepo.settingsFor(userId)).toEqual({ devices: 0, prefs: null });
  });

  it("counts only the user's devices and returns the preferences (PUSH-15)", async () => {
    const userId = await insertTestUser();
    const other = await insertTestUser();
    await pushRepo.subscribe(userId, sub());
    await pushRepo.subscribe(userId, sub());
    await pushRepo.subscribe(other, sub());

    expect(await pushRepo.settingsFor(userId)).toEqual({ devices: 2, prefs: DEFAULTS });
  });
});

describe("pushRepo.updatePrefs", () => {
  it("saves every field on the caller's row only (PUSH-16, PUSH-19)", async () => {
    const userId = await insertTestUser();
    const other = await insertTestUser();
    await pushRepo.subscribe(userId, sub());
    await pushRepo.subscribe(other, sub());
    const prefs = { reminder: true, due: true, security: false, admin: false, hour: 0 };

    expect(await pushRepo.updatePrefs(userId, prefs)).toBe("ok");

    expect((await pushRepo.settingsFor(userId)).prefs).toEqual(prefs);
    expect((await pushRepo.settingsFor(other)).prefs).toEqual(DEFAULTS);
  });

  it("answers no_prefs and creates nothing when the user has no preferences row (PUSH-18)", async () => {
    const userId = await insertTestUser();

    expect(await pushRepo.updatePrefs(userId, { ...DEFAULTS, reminder: true })).toBe("no_prefs");

    expect(await db.select().from(pushPreference)).toEqual([]);
  });
});

describe("pushRepo.subscriptionsOf", () => {
  it("returns endpoint and keys of the user's subscriptions only", async () => {
    const userId = await insertTestUser();
    const other = await insertTestUser();
    const a = sub(endpoint(), "p-a", "a-a");
    const b = sub(endpoint(), "p-b", "a-b");
    await pushRepo.subscribe(userId, a);
    await pushRepo.subscribe(userId, b);
    await pushRepo.subscribe(other, sub());

    const subs = await pushRepo.subscriptionsOf(userId);

    expect(subs).toHaveLength(2);
    expect(subs).toEqual(expect.arrayContaining([a, b]));
  });
});

describe("pushRepo.securityTargets", () => {
  it("returns the user's subscriptions while security is on (PUSH-33, PUSH-34)", async () => {
    const userId = await insertTestUser();
    const s = sub(endpoint(), "p-s", "a-s");
    await pushRepo.subscribe(userId, s);

    expect(await pushRepo.securityTargets(userId)).toEqual([s]);
  });

  it("is empty when security is off (PUSH-36)", async () => {
    const userId = await insertTestUser();
    await pushRepo.subscribe(userId, sub());
    await pushRepo.updatePrefs(userId, { ...DEFAULTS, security: false });

    expect(await pushRepo.securityTargets(userId)).toEqual([]);
  });

  it("is empty when the user has no preferences row", async () => {
    const userId = await insertTestUser();
    await db.insert(pushSubscription).values({ userId, ...sub() });

    expect(await pushRepo.securityTargets(userId)).toEqual([]);
  });
});
