import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import {
  redirectIfSignedIn,
  requireAdminForAction,
  requireAdminForPage,
  requireSessionForAction,
  requireSessionForPage,
} from "./auth-guard";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

const { redirect } = await import("next/navigation");

setupTestDb();

beforeEach(() => {
  request.headers = new Headers();
  vi.mocked(redirect).mockClear();
});

describe("without a session", () => {
  it("action guard returns UNAUTHORIZED", async () => {
    expect(await requireSessionForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  it("page guard redirects to /login", async () => {
    await expect(requireSessionForPage()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("with an expired session", () => {
  it("both guards reject it", async () => {
    const { userId, cookie } = await createSignedInUser();
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(session.userId, userId));
    request.headers = new Headers({ cookie });

    expect(await requireSessionForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
    await expect(requireSessionForPage()).rejects.toThrow("NEXT_REDIRECT /login");
  });
});

describe("with a valid session", () => {
  it("action guard returns the user id", async () => {
    const { userId, cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });

    expect(await requireSessionForAction()).toEqual({ ok: true, userId });
  });

  it("page guard returns the user id without redirecting", async () => {
    const { userId, cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });

    expect(await requireSessionForPage()).toEqual({ userId, isAdmin: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

describe("with a session of a user who lost approval after signing in", () => {
  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "treats a %s user as signed out in both guards",
    async (status) => {
      const { cookie } = await createSignedInUser(undefined, status);
      request.headers = new Headers({ cookie });

      expect(await requireSessionForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
      await expect(requireSessionForPage()).rejects.toThrow("NEXT_REDIRECT /login");
      expect(redirect).toHaveBeenCalledWith("/login");
    },
  );
});

describe("admin flag", () => {
  it("page guard returns isAdmin true for the admin", async () => {
    const { userId, cookie } = await createSignedInUser(ADMIN_EMAIL);
    request.headers = new Headers({ cookie });

    expect(await requireSessionForPage()).toEqual({ userId, isAdmin: true });
  });
});

describe("requireAdminForAction", () => {
  it("returns the admin id", async () => {
    const { userId, cookie } = await createSignedInUser(ADMIN_EMAIL);
    request.headers = new Headers({ cookie });

    expect(await requireAdminForAction()).toEqual({ ok: true, userId });
  });

  it("returns UNAUTHORIZED to an approved user who is not the admin", async () => {
    const { cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });

    expect(await requireAdminForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  it("returns UNAUTHORIZED without a session", async () => {
    expect(await requireAdminForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });
});

describe("requireAdminForPage", () => {
  it("returns the admin id without redirecting", async () => {
    const { userId, cookie } = await createSignedInUser(ADMIN_EMAIL);
    request.headers = new Headers({ cookie });

    expect(await requireAdminForPage()).toEqual({ userId });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects an approved user who is not the admin to /", async () => {
    const { cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });

    await expect(requireAdminForPage()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to /login without a session", async () => {
    await expect(requireAdminForPage()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("without ADMIN_EMAIL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets nobody through the admin guards", async () => {
    const { cookie } = await createSignedInUser(ADMIN_EMAIL);
    request.headers = new Headers({ cookie });
    vi.stubEnv("ADMIN_EMAIL", "");

    expect(await requireAdminForAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
    await expect(requireAdminForPage()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(await requireSessionForPage()).toMatchObject({ isAdmin: false });
  });
});

describe("redirectIfSignedIn", () => {
  it("redirects an approved signed-in user to /", async () => {
    const { cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });

    await expect(redirectIfSignedIn()).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("returns normally without a session", async () => {
    await expect(redirectIfSignedIn()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "returns normally with the session of a %s user",
    async (status) => {
      const { cookie } = await createSignedInUser(undefined, status);
      request.headers = new Headers({ cookie });

      await expect(redirectIfSignedIn()).resolves.toBeUndefined();
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
