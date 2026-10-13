import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { loginAttempt } from "@/lib/db/schema";
import { setupTestDb } from "@/test/db";

// The provider list is fixed when auth.ts is evaluated: the credentials must exist before the import.
vi.hoisted(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    set: vi.fn(),
    get: vi.fn(),
    getAll: () => [],
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

const { signInGoogleAction } = await import("./auth-google");
const { redirect } = await import("next/navigation");
const { auth } = await import("@/lib/auth");

setupTestDb();

afterEach(() => {
  vi.mocked(redirect).mockClear();
  vi.restoreAllMocks();
});
afterAll(() => {
  vi.unstubAllEnvs();
});

/** The URL the action redirected to, taken from the thrown redirect. */
async function redirectUrl(): Promise<URL> {
  const thrown = await signInGoogleAction().catch((error: Error) => error);
  expect(thrown).toBeInstanceOf(Error);
  const message = (thrown as Error).message;
  expect(message.startsWith("NEXT_REDIRECT ")).toBe(true);
  return new URL(message.slice("NEXT_REDIRECT ".length));
}

describe("signInGoogleAction", () => {
  it("redirects to Google with client_id, state and the callback redirect_uri", async () => {
    const url = await redirectUrl();

    expect(url.origin + url.pathname).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(url.searchParams.get("client_id")).toBe("test-client.apps.googleusercontent.com");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/callback\/google$/);
  });

  it("returns ok false and does not redirect when Google is not configured", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    try {
      const result = await signInGoogleAction();

      expect(result).toMatchObject({ ok: false });
      expect(redirect).not.toHaveBeenCalled();
    } finally {
      vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
    }
  });

  it("does not touch login_attempt", async () => {
    await loginAttemptsRepo.recordFailure("ana@x.com");

    await redirectUrl();

    expect(await db.$count(loginAttempt)).toBe(1);
  });
});

/** An approved user that already has the Google account `sub` linked (and no password). */
async function insertGoogleUser(sub: string) {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Ana", email: "ana@x.com", status: "approved" });
  await db.insert(account).values({ id: randomUUID(), userId: id, accountId: sub, providerId: "google" });
  return id;
}

describe("signInGoogleAction OAuth destinations", () => {
  /** Starts the flow through the action, then drives the real callback with its state and cookies. */
  async function callbackAfterAction(query: (state: string | null) => string, sub = randomUUID()) {
    const ctx = await auth.$context;
    const google = ctx.socialProviders.find((p) => p.id === "google");
    if (!google) throw new Error("google provider is not configured");
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    vi.spyOn(google, "validateAuthorizationCode").mockResolvedValueOnce({
      accessToken: "access",
      idToken: `${part({ alg: "RS256", typ: "JWT" })}.${part({
        sub,
        email: "ana@x.com",
        email_verified: true,
        name: "Ana",
      })}.sig`,
    });

    // nextCookies reaches cookies() through a module vitest cannot mock, so the Set-Cookie headers of
    // the real call are captured here; the action's own arguments are forwarded untouched.
    const cookies: string[] = [];
    const signInSocial = auth.api.signInSocial;
    type SignInInput = Parameters<typeof signInSocial>[0];
    vi.spyOn(auth.api, "signInSocial").mockImplementationOnce((async (input: SignInInput) => {
      const { headers, response } = await signInSocial({ ...input, returnHeaders: true } as SignInInput & {
        returnHeaders: true;
      });
      cookies.push(...headers.getSetCookie());
      return response;
    }) as typeof auth.api.signInSocial);

    const state = (await redirectUrl()).searchParams.get("state");
    const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
    const response = await auth.handler(
      new Request(`${ctx.baseURL}/callback/google?${query(state)}`, { headers: { cookie } }),
    );
    return new URL(response.headers.get("location") ?? "", ctx.baseURL);
  }

  it("sends a cancelled consent back to /login with an error and opens no session", async () => {
    const target = await callbackAfterAction((state) => `error=access_denied&state=${state}`);

    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBeTruthy();
    expect(await db.$count(session)).toBe(0);
  });

  it("sends an approved user to / without error and opens one session", async () => {
    const sub = randomUUID();
    await insertGoogleUser(sub);

    const target = await callbackAfterAction((state) => `code=code&state=${state}`, sub);

    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("error")).toBeNull();
    expect(await db.$count(session)).toBe(1);
  });
});
