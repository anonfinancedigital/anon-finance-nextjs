import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No real network: web-push is replaced, and Sentry too (logActionError reports there).
const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("web-push", async (importOriginal) => {
  const actual = await importOriginal<typeof import("web-push") & { default: typeof import("web-push") }>();
  return { ...actual, default: { ...actual.default, sendNotification }, sendNotification };
});
const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

const { WebPushError } = await import("web-push");
const { sendPush } = await import("./send");

const config = { publicKey: "PUBLIC-KEY", privateKey: "PRIVATE-KEY", subject: "mailto:ops@example.com" };
const sub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-123",
  p256dh: "P256DH-SECRET-KEY",
  auth: "AUTH-SECRET",
};

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleLog: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sendNotification.mockReset();
  captureException.mockReset();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

/** Everything written to the console or Sentry during the test, as one string. */
const allLogs = () =>
  JSON.stringify([
    consoleError.mock.calls,
    consoleLog.mock.calls,
    consoleWarn.mock.calls,
    captureException.mock.calls.map(([error, context]) => [String(error), context]),
  ]);

const rejection = (status: number) =>
  new WebPushError("Received unexpected response code", status, {}, "body", sub.endpoint);

describe("sendPush", () => {
  it("sends the fixed payload of the body with TTL 86400 and the VAPID details (PUSH-29)", async () => {
    sendNotification.mockResolvedValue({ statusCode: 201, body: "", headers: {} });

    expect(await sendPush(config, sub, "Que tal registrar seus gastos de hoje?")).toBe("sent");

    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [target, payload, options] = sendNotification.mock.calls[0];
    expect(target).toEqual({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } });
    expect(payload).toBe('{"title":"ANON","body":"Que tal registrar seus gastos de hoje?","url":"/"}');
    expect(options).toMatchObject({
      TTL: 86400,
      vapidDetails: { subject: "mailto:ops@example.com", publicKey: "PUBLIC-KEY", privateKey: "PRIVATE-KEY" },
    });
  });

  it.each([404, 410])("answers gone when the push service answers %i (PUSH-27)", async (status) => {
    sendNotification.mockRejectedValue(rejection(status));
    expect(await sendPush(config, sub, "x")).toBe("gone");
  });

  it.each([500, 429])("answers failed and logs only push_%i when the service answers it (PUSH-28)", async (status) => {
    sendNotification.mockRejectedValue(rejection(status));

    expect(await sendPush(config, sub, "x")).toBe("failed");

    expect(consoleError).toHaveBeenCalledWith("sendPush", `push_${status}`);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { action: "sendPush", code: `push_${status}` },
    });
  });

  it("answers failed and logs a push_ code on a network error (PUSH-28)", async () => {
    const network = Object.assign(new Error(`connect ECONNREFUSED ${sub.endpoint}`), { code: "ECONNREFUSED" });
    sendNotification.mockRejectedValue(network);

    expect(await sendPush(config, sub, "x")).toBe("failed");

    const [action, code] = consoleError.mock.calls[0];
    expect(action).toBe("sendPush");
    expect(code).toMatch(/^push_/);
  });

  it.each([
    ["a host outside the list", "https://internal.example.com/push"],
    ["plain http", "http://fcm.googleapis.com/fcm/send/x"],
    ["a lookalike host", "https://evil.push.apple.com.attacker.net/x"],
    ["localhost", "https://localhost/x"],
  ])("answers failed without calling web-push for %s (SSRF, PUSH-05)", async (_label, endpoint) => {
    expect(await sendPush(config, { ...sub, endpoint }, "x")).toBe("failed");
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("never writes the endpoint or the keys to any log (PUSH-28)", async () => {
    for (const error of [rejection(500), rejection(410), new Error(`boom ${sub.endpoint} ${sub.p256dh}`)]) {
      sendNotification.mockRejectedValueOnce(error);
      await sendPush(config, sub, "x");
    }
    await sendPush(config, { ...sub, endpoint: "https://internal.example.com/push" }, "x");

    const logs = allLogs();
    expect(logs).not.toContain("device-123");
    expect(logs).not.toContain("internal.example.com");
    expect(logs).not.toContain(sub.p256dh);
    expect(logs).not.toContain(sub.auth);
    expect(logs).not.toContain(config.privateKey);
  });
});
