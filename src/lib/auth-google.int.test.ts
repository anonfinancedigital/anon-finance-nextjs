import { randomUUID } from "node:crypto";
import { format } from "node:util";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import type { UserStatus } from "@/lib/domain/user-status";
import { insertCredentialUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";

// The provider list is fixed when auth.ts is evaluated: the credentials must exist before
// the import.
vi.hoisted(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
});

const { auth } = await import("./auth");

setupTestDb();
afterAll(() => {
  vi.unstubAllEnvs();
});

const EMAIL = "ana@x.com";

const ctx = await auth.$context;
const GOOGLE_SOURCE = { method: "oauth", oauth: { providerId: "google" } } as const;
const usersWith = (email: string) => db.select().from(user).where(eq(user.email, email));
const sessionsOf = (userId: string) => db.$count(session, eq(session.userId, userId));
const googleAccountsOf = (userId: string) =>
  db.$count(account, and(eq(account.userId, userId), eq(account.providerId, "google")));

describe("user creation through the adapter (Google sign-up)", () => {
  it("refuses a user whose e-mail is not verified and stores nothing", async () => {
    const created = await ctx.internalAdapter.createUser(
      { name: "Ana", email: EMAIL, emailVerified: false },
      GOOGLE_SOURCE,
    );

    expect(created).toBeNull();
    expect(await db.$count(user)).toBe(0);
  });

  it("stores a verified user as pending even when the data asks for approved", async () => {
    await ctx.internalAdapter.createUser(
      { name: "Ana", email: EMAIL, emailVerified: true, status: "approved" },
      GOOGLE_SOURCE,
    );

    const [row] = await usersWith(EMAIL);
    expect(row.status).toBe("pending");
  });
});

describe("session creation through the adapter", () => {
  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "refuses the session of a %s user",
    async (status) => {
      const userId = await insertCredentialUser(EMAIL, undefined, status);

      const created = await ctx.internalAdapter.createSession(userId);

      expect(created).toBeNull();
      expect(await sessionsOf(userId)).toBe(0);
    },
  );

  it("creates the session of an approved user", async () => {
    const userId = await insertCredentialUser(EMAIL);

    const created = await ctx.internalAdapter.createSession(userId);

    expect(created?.userId).toBe(userId);
    expect(await sessionsOf(userId)).toBe(1);
  });
});

// Simulated Google: the code exchange returns an unsigned id_token carrying the profile and
// the real provider maps it (sub -> account id, email_verified -> emailVerified).
function idToken(profile: { sub: string; email: string; email_verified: boolean }) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", typ: "JWT" })}.${part({ ...profile, name: "Ana" })}.sig`;
}

async function googleCallback(
  profile: { email: string; email_verified: boolean; sub?: string },
  options: { query?: (state: string | null) => string; exchangeFails?: boolean } = {},
) {
  const google = ctx.socialProviders.find((p) => p.id === "google");
  if (!google) throw new Error("google provider is not configured");
  const sub = profile.sub ?? randomUUID();
  const exchange = vi.spyOn(google, "validateAuthorizationCode");
  if (options.exchangeFails) {
    exchange.mockRejectedValueOnce(new Error("invalid_grant"));
  } else {
    exchange.mockResolvedValueOnce({
      accessToken: "access",
      idToken: idToken({ sub, email: profile.email, email_verified: profile.email_verified }),
    });
  }

  const started = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login" },
    returnHeaders: true,
  });
  const state = new URL(started.response.url as string).searchParams.get("state");
  const cookie = started.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const query = options.query ? options.query(state) : `code=code&state=${state}`;

  const response = await auth.handler(
    new Request(`${ctx.baseURL}/callback/google?${query}`, {
      headers: { cookie },
    }),
  );
  return {
    location: response.headers.get("location") ?? "",
    setCookies: response.headers.getSetCookie(),
  };
}

const blockCookie = (setCookies: string[]) =>
  setCookies.find((c) => c.startsWith("anon_login_block="));

describe("Google callback", () => {
  let logged: string[];

  beforeEach(() => {
    logged = [];
    for (const method of ["log", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(format(...args));
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a new verified user as pending, links Google, opens no session and sets the block cookie", async () => {
    const result = await googleCallback({ email: EMAIL, email_verified: true });

    const [row] = await usersWith(EMAIL);
    expect(row.status).toBe("pending");
    expect(await googleAccountsOf(row.id)).toBe(1);
    expect(await sessionsOf(row.id)).toBe(0);
    const target = new URL(result.location, ctx.baseURL);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBeTruthy();
    expect(blockCookie(result.setCookies)).toMatch(
      /^anon_login_block=pending; Max-Age=60; Path=\/login; HttpOnly; SameSite=Lax$/i,
    );
  });

  it("creates the ADMIN_EMAIL user as pending too", async () => {
    const adminEmail = process.env.ADMIN_EMAIL as string;

    await googleCallback({ email: adminEmail, email_verified: true });

    const [row] = await usersWith(adminEmail.toLowerCase());
    expect(row.status).toBe("pending");
  });

  it("refuses an unverified e-mail: no user, no session, back to /login with an error", async () => {
    const result = await googleCallback({ email: EMAIL, email_verified: false });

    const target = new URL(result.location, ctx.baseURL);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBeTruthy();
    expect(await db.$count(user)).toBe(0);
    expect(await db.$count(session)).toBe(0);
    expect(blockCookie(result.setCookies)).toBeUndefined();
  });

  it("links an approved user with an unverified local e-mail, keeps the status and opens a session", async () => {
    const userId = await insertCredentialUser(EMAIL);

    const result = await googleCallback({ email: EMAIL, email_verified: true });

    const [row] = await usersWith(EMAIL);
    expect(row.status).toBe("approved");
    expect(await googleAccountsOf(userId)).toBe(1);
    expect(await sessionsOf(userId)).toBe(1);
    expect(new URL(result.location, ctx.baseURL).pathname).toBe("/");
  });

  it("does not link an existing user when Google reports email_verified = false", async () => {
    const userId = await insertCredentialUser(EMAIL);

    const result = await googleCallback({ email: EMAIL, email_verified: false });

    expect(await googleAccountsOf(userId)).toBe(0);
    expect(await sessionsOf(userId)).toBe(0);
    expect(new URL(result.location, ctx.baseURL).pathname).toBe("/login");
  });

  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "links a %s user, keeps the status, opens no session and names the status in the block cookie",
    async (status: UserStatus) => {
      const userId = await insertCredentialUser(EMAIL, undefined, status);

      const result = await googleCallback({ email: EMAIL, email_verified: true });

      const [row] = await usersWith(EMAIL);
      expect(row.status).toBe(status);
      expect(await googleAccountsOf(userId)).toBe(1);
      expect(await sessionsOf(userId)).toBe(0);
      const target = new URL(result.location, ctx.baseURL);
      expect(target.pathname).toBe("/login");
      expect(target.searchParams.get("error")).toBeTruthy();
      expect(blockCookie(result.setCookies)).toMatch(new RegExp(`^anon_login_block=${status};`));
    },
  );

  it("signs the same user in when the linked Google account later reports another e-mail", async () => {
    const sub = randomUUID();
    const userId = await insertCredentialUser(EMAIL);
    await googleCallback({ email: EMAIL, email_verified: true, sub });
    expect(await googleAccountsOf(userId)).toBe(1);
    expect(await sessionsOf(userId)).toBe(1);

    const result = await googleCallback({ email: "outro@x.com", email_verified: true, sub });

    expect(new URL(result.location, ctx.baseURL).pathname).toBe("/");
    expect(await sessionsOf(userId)).toBe(2);
    expect(await usersWith("outro@x.com")).toHaveLength(0);
    expect(await db.$count(user)).toBe(1);
    expect(await googleAccountsOf(userId)).toBe(1);
  });

  it("goes back to /login with an error and no session when the user cancels at Google", async () => {
    const result = await googleCallback(
      { email: EMAIL, email_verified: true },
      { query: (state) => `error=access_denied&state=${state}` },
    );

    const target = new URL(result.location, ctx.baseURL);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBeTruthy();
    expect(await db.$count(session)).toBe(0);
    expect(await db.$count(user)).toBe(0);
  });

  it("goes back to /login with an error and no session when the code exchange is rejected", async () => {
    const result = await googleCallback(
      { email: EMAIL, email_verified: true },
      { exchangeFails: true },
    );

    const target = new URL(result.location, ctx.baseURL);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBeTruthy();
    expect(await db.$count(session)).toBe(0);
    expect(await db.$count(user)).toBe(0);
  });

  it("creates exactly one user for two concurrent callbacks of the same new e-mail", async () => {
    const sub = randomUUID();

    await Promise.allSettled([
      googleCallback({ email: EMAIL, email_verified: true, sub }),
      googleCallback({ email: EMAIL, email_verified: true, sub }),
    ]);

    expect(await db.$count(user, eq(user.email, EMAIL))).toBe(1);
  });

  it("logs no e-mail or profile while handling failures", async () => {
    await googleCallback({ email: EMAIL, email_verified: false });
    await insertCredentialUser("bia@x.com", undefined, "revoked");
    await googleCallback({ email: "bia@x.com", email_verified: true });
    // The losing insert fails on the unique e-mail; the database error carries the e-mail.
    const sub = randomUUID();
    await Promise.allSettled([
      googleCallback({ email: "cris@x.com", email_verified: true, sub }),
      googleCallback({ email: "cris@x.com", email_verified: true, sub }),
    ]);

    expect(logged.length).toBeGreaterThan(0);
    expect(logged.join("\n")).not.toMatch(/ana@x\.com|bia@x\.com|cris@x\.com|\bAna\b/);
  });
});

describe("without Google credentials", () => {
  it("does not configure the google provider", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.resetModules();

    const { auth: plain } = await import("./auth");

    expect(plain.options.socialProviders).not.toHaveProperty("google");
  });
});
