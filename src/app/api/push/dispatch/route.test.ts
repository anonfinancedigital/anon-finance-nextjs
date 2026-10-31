import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The runner and the database are replaced: these tests cover only the route's gatekeeping.
vi.mock("@/lib/db/client", () => ({ db: {}, pool: {} }));
const { runDispatch } = vi.hoisted(() => ({ runDispatch: vi.fn() }));
vi.mock("@/lib/push/dispatch", () => ({ runDispatch }));
const { timingSafeEqual } = vi.hoisted(() => ({ timingSafeEqual: vi.fn() }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  timingSafeEqual.mockImplementation(actual.timingSafeEqual);
  return { ...actual, default: { ...actual, timingSafeEqual }, timingSafeEqual };
});

const route = await import("./route");
const { POST } = route;

const SECRET = "s3cr3t-cron-value-0123456789";
const ENV = {
  CRON_SECRET: SECRET,
  VAPID_PUBLIC_KEY: "pub",
  VAPID_PRIVATE_KEY: "priv",
  VAPID_SUBJECT: "mailto:ops@example.com",
};

const call = (authorization?: string) =>
  POST(
    new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: authorization === undefined ? {} : { Authorization: authorization },
    }),
  );

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
  runDispatch.mockReset();
  runDispatch.mockResolvedValue({ sent: 3, removed: 1, failed: 2 });
  timingSafeEqual.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/push/dispatch", () => {
  it.each(Object.keys(ENV))("answers 503 with an empty body without running when %s is unset (PUSH-21)", async (key) => {
    vi.stubEnv(key, "");

    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(runDispatch).not.toHaveBeenCalled();
  });

  it("checks the configuration before the secret: 503 even without Authorization", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    expect((await call()).status).toBe(503);
  });

  it.each([
    ["no Authorization header", undefined],
    ["a wrong secret of the same length", `Bearer ${"x".repeat(SECRET.length)}`],
    ["a secret of another length", `Bearer ${SECRET}-longer`],
    ["the secret without the Bearer scheme", SECRET],
    ["an empty bearer", "Bearer "],
  ])("answers 401 with an empty body and sends nothing for %s (PUSH-20)", async (_label, authorization) => {
    const response = await call(authorization);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(runDispatch).not.toHaveBeenCalled();
  });

  it("compares the secret in constant time over equal-length digests (PUSH-20)", async () => {
    await call(`Bearer ${SECRET}-longer`);

    expect(timingSafeEqual).toHaveBeenCalledTimes(1);
    const [a, b] = timingSafeEqual.mock.calls[0];
    expect(a.length).toBe(32);
    expect(b.length).toBe(32);
  });

  it("answers 200 with {sent, removed, failed} only when the secret is right (PUSH-31)", async () => {
    runDispatch.mockResolvedValue({ sent: 3, removed: 1, failed: 2, extra: "leak" });

    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"sent":3,"removed":1,"failed":2}');
    expect(runDispatch).toHaveBeenCalledTimes(1);
    expect(runDispatch.mock.calls[0][0]).toMatchObject({
      config: { publicKey: "pub", privateKey: "priv", subject: "mailto:ops@example.com" },
    });
    expect(runDispatch.mock.calls[0][0].now).toBeInstanceOf(Date);
  });

  it("exports only POST as a handler, with maxDuration 60", () => {
    expect(route).not.toHaveProperty("GET");
    expect(["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].filter((m) => m in route)).toEqual([]);
    expect(route.maxDuration).toBe(60);
  });
});
