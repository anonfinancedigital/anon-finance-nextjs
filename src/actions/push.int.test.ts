import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { db } from "@/lib/db/client";
import { pushRepo } from "@/lib/db/repos/push";
import { pushPreference, pushSubscription } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { subscribePushAction, unsubscribePushAction, updatePushPreferencesAction } from "./push";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

setupTestDb();

const VAPID = {
  VAPID_PUBLIC_KEY: "public-key",
  VAPID_PRIVATE_KEY: "private-key",
  VAPID_SUBJECT: "mailto:admin@example.com",
} as const;
const VAPID_NAMES = Object.keys(VAPID) as (keyof typeof VAPID)[];

const P256DH = Buffer.concat([Buffer.from([0x04]), Buffer.alloc(64, 7)]).toString("base64url");
const AUTH = Buffer.alloc(16, 3).toString("base64url");
const DEFAULTS = { reminder: false, due: false, security: true, admin: true, hour: 9 };

/** The shape `PushSubscription.toJSON()` gives in the browser. */
const browserSub = (endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, keys = { p256dh: P256DH, auth: AUTH }) => ({
  endpoint,
  expirationTime: null,
  keys,
});

const subscriptions = () => db.select().from(pushSubscription);
const preferences = () => db.select().from(pushPreference);

let saved: Partial<Record<keyof typeof VAPID, string>>;
let userId: string;

beforeEach(async () => {
  saved = Object.fromEntries(VAPID_NAMES.map((name) => [name, process.env[name]]));
  Object.assign(process.env, VAPID);
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
});

afterEach(() => {
  for (const name of VAPID_NAMES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  vi.restoreAllMocks();
});

const signOut = () => {
  request.headers = new Headers();
};

const signInRevoked = async () => {
  const revoked = await createSignedInUser(undefined, "revoked");
  request.headers = new Headers({ cookie: revoked.cookie });
};

describe("subscribePushAction", () => {
  it("stores the subscription for the caller and creates the default preferences (PUSH-03)", async () => {
    const sub = browserSub();

    expect(await subscribePushAction(sub)).toEqual({ ok: true });

    expect(await subscriptions()).toEqual([
      expect.objectContaining({ userId, endpoint: sub.endpoint, p256dh: P256DH, auth: AUTH }),
    ]);
    expect(await preferences()).toEqual([expect.objectContaining({ userId, ...DEFAULTS })]);
  });

  it("ignores a userId sent by the client and stores for the caller (PUSH-19)", async () => {
    const other = await createSignedInUser();

    expect(await subscribePushAction({ ...browserSub(), userId: other.userId } as never)).toEqual({ ok: true });

    expect((await subscriptions()).map((s) => s.userId)).toEqual([userId]);
    expect((await preferences()).map((p) => p.userId)).toEqual([userId]);
  });

  it.each([
    ["http", "http://fcm.googleapis.com/fcm/send/x"],
    ["another host", "https://evil.example.com/push"],
    ["a look-alike host", "https://evil.push.apple.com.attacker.net/x"],
    ["no endpoint", undefined],
  ])("refuses %s with the exact message and stores nothing (PUSH-05)", async (_, endpoint) => {
    const result = await subscribePushAction({ ...browserSub(), endpoint });

    expect(result).toMatchObject({ ok: false, error: "Este navegador não é compatível com notificações" });
    expect(await subscriptions()).toEqual([]);
    expect(await preferences()).toEqual([]);
  });

  it.each([
    ["p256dh with 64 bytes", { p256dh: Buffer.alloc(64, 4).toString("base64url"), auth: AUTH }],
    ["p256dh not starting with 0x04", { p256dh: Buffer.alloc(65, 5).toString("base64url"), auth: AUTH }],
    ["auth with 15 bytes", { p256dh: P256DH, auth: Buffer.alloc(15, 1).toString("base64url") }],
    ["auth not base64url", { p256dh: P256DH, auth: "não é base64!" }],
  ])("refuses %s with \"Inscrição inválida\" and stores nothing (PUSH-06)", async (_, keys) => {
    const result = await subscribePushAction(browserSub(undefined, keys));

    expect(result).toMatchObject({ ok: false, error: "Inscrição inválida" });
    expect(await subscriptions()).toEqual([]);
  });

  it("refuses a missing keys object with \"Inscrição inválida\"", async () => {
    const result = await subscribePushAction({ endpoint: browserSub().endpoint } as never);

    expect(result).toMatchObject({ ok: false, error: "Inscrição inválida" });
    expect(await subscriptions()).toEqual([]);
  });

  it("refuses a sixth device with the exact message and stores nothing (PUSH-07)", async () => {
    for (let i = 0; i < 5; i++) expect(await subscribePushAction(browserSub())).toEqual({ ok: true });
    const sixth = browserSub();

    expect(await subscribePushAction(sixth)).toEqual({ ok: false, error: "Limite de 5 dispositivos atingido" });

    const rows = await subscriptions();
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.endpoint)).not.toContain(sixth.endpoint);
  });

  it("updates the keys and owner of an endpoint already stored without a second row (PUSH-08)", async () => {
    const previous = await createSignedInUser();
    const endpoint = browserSub().endpoint;
    await pushRepo.subscribe(previous.userId, { endpoint, p256dh: "old", auth: "old" });

    expect(await subscribePushAction(browserSub(endpoint))).toEqual({ ok: true });

    expect(await subscriptions()).toEqual([
      expect.objectContaining({ userId, endpoint, p256dh: P256DH, auth: AUTH }),
    ]);
  });

  it("refuses without the VAPID configuration and stores nothing", async () => {
    for (const name of VAPID_NAMES) {
      Object.assign(process.env, VAPID);
      delete process.env[name];
      const subscribe = vi.spyOn(pushRepo, "subscribe");

      const result = await subscribePushAction(browserSub());

      expect(result.ok).toBe(false);
      expect(subscribe).not.toHaveBeenCalled();
      subscribe.mockRestore();
    }
    expect(await subscriptions()).toEqual([]);
  });

  it("answers UNAUTHORIZED without a session and does not touch the database (PUSH-10)", async () => {
    signOut();
    const subscribe = vi.spyOn(pushRepo, "subscribe");

    expect(await subscribePushAction(browserSub())).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(subscribe).not.toHaveBeenCalled();
    expect(await subscriptions()).toEqual([]);
  });

  it("answers UNAUTHORIZED for a revoked user (PUSH-10)", async () => {
    await signInRevoked();
    const subscribe = vi.spyOn(pushRepo, "subscribe");

    expect(await subscribePushAction(browserSub())).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(subscribe).not.toHaveBeenCalled();
    expect(await subscriptions()).toEqual([]);
  });

  it("answers SAVE_FAILED when the database fails", async () => {
    vi.spyOn(pushRepo, "subscribe").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await subscribePushAction(browserSub())).toEqual({ ok: false, error: SAVE_FAILED });
  });
});

describe("unsubscribePushAction", () => {
  it("deletes the caller's row with that endpoint (PUSH-09)", async () => {
    const gone = browserSub();
    const kept = browserSub();
    await subscribePushAction(gone);
    await subscribePushAction(kept);

    expect(await unsubscribePushAction(gone.endpoint)).toEqual({ ok: true });

    expect((await subscriptions()).map((s) => s.endpoint)).toEqual([kept.endpoint]);
  });

  it("does not delete another user's endpoint (PUSH-09)", async () => {
    const other = await createSignedInUser();
    const endpoint = browserSub().endpoint;
    await pushRepo.subscribe(other.userId, { endpoint, p256dh: P256DH, auth: AUTH });

    expect(await unsubscribePushAction(endpoint)).toEqual({ ok: true });

    expect(await subscriptions()).toEqual([expect.objectContaining({ userId: other.userId, endpoint })]);
  });

  it("answers UNAUTHORIZED without a session and does not touch the database (PUSH-10)", async () => {
    const endpoint = browserSub().endpoint;
    await pushRepo.subscribe(userId, { endpoint, p256dh: P256DH, auth: AUTH });
    signOut();
    const unsubscribe = vi.spyOn(pushRepo, "unsubscribe");

    expect(await unsubscribePushAction(endpoint)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(unsubscribe).not.toHaveBeenCalled();
    expect(await subscriptions()).toHaveLength(1);
  });

  it("answers UNAUTHORIZED for a revoked user (PUSH-10)", async () => {
    await signInRevoked();
    const unsubscribe = vi.spyOn(pushRepo, "unsubscribe");

    expect(await unsubscribePushAction(browserSub().endpoint)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED when the database fails", async () => {
    vi.spyOn(pushRepo, "unsubscribe").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await unsubscribePushAction(browserSub().endpoint)).toEqual({ ok: false, error: SAVE_FAILED });
  });
});

describe("updatePushPreferencesAction", () => {
  const prefs = { reminder: true, due: true, security: false, admin: false, hour: 22 };

  it("saves every field for the caller (PUSH-16)", async () => {
    await subscribePushAction(browserSub());

    expect(await updatePushPreferencesAction(prefs)).toEqual({ ok: true });

    expect(await preferences()).toEqual([expect.objectContaining({ userId, ...prefs })]);
  });

  it("applies to the caller's row, never to a userId sent by the client (PUSH-19)", async () => {
    const other = await createSignedInUser();
    await pushRepo.subscribe(other.userId, { endpoint: browserSub().endpoint, p256dh: P256DH, auth: AUTH });
    await subscribePushAction(browserSub());

    expect(await updatePushPreferencesAction({ ...prefs, userId: other.userId } as never)).toEqual({ ok: true });

    expect((await pushRepo.settingsFor(userId)).prefs).toEqual(prefs);
    expect((await pushRepo.settingsFor(other.userId)).prefs).toEqual(DEFAULTS);
  });

  it.each([
    ["hour -1", { ...prefs, hour: -1 }],
    ["hour 24", { ...prefs, hour: 24 }],
    ["hour 9.5", { ...prefs, hour: 9.5 }],
    ["a switch as text", { ...prefs, reminder: "true" }],
    ["a missing switch", { due: true, security: true, admin: true, hour: 9 }],
  ])("refuses %s with \"Preferências inválidas\" and saves nothing (PUSH-17)", async (_, input) => {
    await subscribePushAction(browserSub());

    expect(await updatePushPreferencesAction(input as never)).toMatchObject({
      ok: false,
      error: "Preferências inválidas",
    });

    expect((await pushRepo.settingsFor(userId)).prefs).toEqual(DEFAULTS);
  });

  it("refuses with \"Ative as notificações primeiro\" when the caller has no preferences (PUSH-18)", async () => {
    expect(await updatePushPreferencesAction(prefs)).toEqual({ ok: false, error: "Ative as notificações primeiro" });

    expect(await preferences()).toEqual([]);
  });

  it("answers UNAUTHORIZED without a session and does not touch the database (PUSH-10)", async () => {
    signOut();
    const update = vi.spyOn(pushRepo, "updatePrefs");

    expect(await updatePushPreferencesAction(prefs)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(update).not.toHaveBeenCalled();
  });

  it("answers UNAUTHORIZED for a revoked user (PUSH-10)", async () => {
    await signInRevoked();
    const update = vi.spyOn(pushRepo, "updatePrefs");

    expect(await updatePushPreferencesAction(prefs)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(update).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED when the database fails", async () => {
    vi.spyOn(pushRepo, "updatePrefs").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await updatePushPreferencesAction(prefs)).toEqual({ ok: false, error: SAVE_FAILED });
  });
});
