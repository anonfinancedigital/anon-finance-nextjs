import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { requireSessionForAction, requireSessionForPage } from "./auth-guard";

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

    expect(await requireSessionForPage()).toEqual({ userId });
    expect(redirect).not.toHaveBeenCalled();
  });
});
