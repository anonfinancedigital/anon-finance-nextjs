import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pushRepo, type StoredSub } from "@/lib/db/repos/push";
import { insertTestUser, setupTestDb } from "@/test/db";
import type { SendResult } from "./send";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

const { notifySecurity } = await import("./security");

setupTestDb();

const ENV = { VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:ops@example.com" };
const CONFIG = { publicKey: "pub", privateKey: "priv", subject: "mailto:ops@example.com" };

const endpoint = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;

/** A user with `devices` subscriptions; `security` false turns the notice off. */
async function subscribedUser(devices: number, security = true) {
  const userId = await insertTestUser();
  for (let i = 0; i < devices; i++) await pushRepo.subscribe(userId, { endpoint: endpoint(), p256dh: "p", auth: "a" });
  if (!security) await pushRepo.updatePrefs(userId, { reminder: false, due: false, security: false, admin: true, hour: 9 });
  return { userId, endpoints: (await pushRepo.subscriptionsOf(userId)).map((s) => s.endpoint).sort() };
}

const sendMock = () =>
  vi.fn<(config: unknown, sub: StoredSub, body: string) => Promise<SendResult>>(async () => "sent");

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("notifySecurity", () => {
  it("sends the password reset text to every subscription of the user (PUSH-33)", async () => {
    const { userId, endpoints } = await subscribedUser(2);
    const other = await subscribedUser(1);
    const send = sendMock();

    await notifySecurity(userId, "password_reset", { env: ENV, send });

    expect(send.mock.calls.map((c) => c[1].endpoint).sort()).toEqual(endpoints);
    expect(send.mock.calls.map((c) => c[2])).toEqual(["Sua senha foi redefinida.", "Sua senha foi redefinida."]);
    expect(send.mock.calls.every((c) => JSON.stringify(c[0]) === JSON.stringify(CONFIG))).toBe(true);
    expect(send.mock.calls.map((c) => c[1].endpoint)).not.toContain(other.endpoints[0]);
  });

  it("sends the revocation text (PUSH-34)", async () => {
    const { userId } = await subscribedUser(1);
    const send = sendMock();

    await notifySecurity(userId, "revoked", { env: ENV, send });

    expect(send.mock.calls.map((c) => c[2])).toEqual(["Seu acesso ao ANON foi revogado."]);
  });

  it("sends nothing when the user turned security notices off (PUSH-36)", async () => {
    const { userId } = await subscribedUser(1, false);
    const send = sendMock();

    await notifySecurity(userId, "revoked", { env: ENV, send });

    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing to a user without preferences or subscriptions", async () => {
    const userId = await insertTestUser();
    const send = sendMock();

    await notifySecurity(userId, "password_reset", { env: ENV, send });

    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing without the VAPID configuration", async () => {
    const { userId } = await subscribedUser(1);
    const send = sendMock();

    await notifySecurity(userId, "password_reset", { env: { ...ENV, VAPID_PRIVATE_KEY: undefined }, send });

    expect(send).not.toHaveBeenCalled();
  });

  it("does not throw when sending throws, and logs the failure (PUSH-35)", async () => {
    const { userId } = await subscribedUser(1);
    const send = vi.fn(async (): Promise<SendResult> => {
      throw new Error("boom");
    });

    await expect(notifySecurity(userId, "revoked", { env: ENV, send })).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("notifySecurity", "unknown");
  });

  it("deletes a subscription the push service reports gone, and keeps the others (PUSH-27)", async () => {
    const { userId, endpoints } = await subscribedUser(2);
    const send = vi.fn(async (_c: unknown, sub: StoredSub): Promise<SendResult> =>
      sub.endpoint === endpoints[0] ? "gone" : "sent",
    );

    await notifySecurity(userId, "password_reset", { env: ENV, send });

    expect((await pushRepo.subscriptionsOf(userId)).map((s) => s.endpoint)).toEqual([endpoints[1]]);
  });
});
