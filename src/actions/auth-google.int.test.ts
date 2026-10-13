import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
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
  cookies: async () => ({ set: vi.fn(), get: vi.fn(), getAll: () => [] }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

const { signInGoogleAction } = await import("./auth-google");
const { redirect } = await import("next/navigation");

setupTestDb();

afterEach(() => {
  vi.mocked(redirect).mockClear();
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
