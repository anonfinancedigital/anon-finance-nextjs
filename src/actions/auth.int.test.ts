import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { session } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { createSignedInUser, insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { signInAction, signOutAction } from "./auth";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

const { redirect } = await import("next/navigation");

setupTestDb();

const EMAIL = "dono@example.com";
const MINUTE = 60_000;
const INVALID = { ok: false, error: "E-mail ou senha inválidos" };

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const signIn = (email: string, password: string) => signInAction(undefined, form(email, password));

async function sessionsOf(userId: string) {
  return db.$count(session, eq(session.userId, userId));
}

let userId: string;

beforeEach(async () => {
  request.headers = new Headers();
  vi.mocked(redirect).mockClear();
  userId = await insertCredentialUser(EMAIL);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("signInAction", () => {
  it("creates a session and redirects to / with correct credentials", async () => {
    await expect(signIn(EMAIL, TEST_PASSWORD)).rejects.toThrow("NEXT_REDIRECT /");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(await sessionsOf(userId)).toBe(1);
  });

  it("answers a wrong e-mail and a wrong password with the same message", async () => {
    const wrongPassword = await signIn(EMAIL, "senha-errada-000");
    const wrongEmail = await signIn("outro@example.com", TEST_PASSWORD);

    expect(wrongPassword).toEqual(INVALID);
    expect(wrongEmail).toEqual(INVALID);
    expect(redirect).not.toHaveBeenCalled();
    expect(await sessionsOf(userId)).toBe(0);
  });

  it("blocks the 6th attempt after 5 failures, even with the right password", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    for (let i = 0; i < 5; i++) expect(await signIn(EMAIL, "senha-errada-000")).toEqual(INVALID);

    expect(await signIn(EMAIL, TEST_PASSWORD)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 15 minutos",
    });
    expect(await sessionsOf(userId)).toBe(0);
  });

  it("tells how many minutes remain until the lock ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    for (let i = 0; i < 5; i++) await signIn(EMAIL, "senha-errada-000");

    vi.setSystemTime(new Date("2026-10-04T12:10:30Z"));
    expect(await signIn(EMAIL, TEST_PASSWORD)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 5 minutos",
    });
  });

  it("locks for 15 minutes counted from the 5th failure when failures are spread out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.parse("2026-10-04T12:00:00Z");
    for (const minute of [0, 3, 6, 9, 14]) {
      vi.setSystemTime(new Date(start + minute * MINUTE));
      expect(await signIn(EMAIL, "senha-errada-000")).toEqual(INVALID);
    }

    vi.setSystemTime(new Date(start + 20 * MINUTE));
    expect(await signIn(EMAIL, TEST_PASSWORD)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 9 minutos",
    });

    vi.setSystemTime(new Date(start + 29 * MINUTE + 1000));
    await expect(signIn(EMAIL, TEST_PASSWORD)).rejects.toThrow("NEXT_REDIRECT /");
    expect(await sessionsOf(userId)).toBe(1);
  });

  it("uses the singular when 1 minute remains", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    for (let i = 0; i < 5; i++) await signIn(EMAIL, "senha-errada-000");

    vi.setSystemTime(new Date("2026-10-04T12:14:30Z"));
    expect(await signIn(EMAIL, TEST_PASSWORD)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 1 minuto",
    });
  });

  it("does not lock when the 5 failures span more than 15 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.parse("2026-10-04T12:00:00Z");
    for (const minute of [0, 4, 8, 12, 16]) {
      vi.setSystemTime(new Date(start + minute * MINUTE));
      await signIn(EMAIL, "senha-errada-000");
    }

    await expect(signIn(EMAIL, TEST_PASSWORD)).rejects.toThrow("NEXT_REDIRECT /");
  });

  it("releases the e-mail once 15 minutes have passed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    for (let i = 0; i < 5; i++) await signIn(EMAIL, "senha-errada-000");

    vi.setSystemTime(new Date(Date.parse("2026-10-04T12:00:00Z") + 15 * MINUTE + 1000));
    await expect(signIn(EMAIL, TEST_PASSWORD)).rejects.toThrow("NEXT_REDIRECT /");
    expect(await sessionsOf(userId)).toBe(1);
  });

  it("clears the recorded failures on success", async () => {
    for (let i = 0; i < 4; i++) await signIn(EMAIL, "senha-errada-000");
    expect(await loginAttemptsRepo.countRecentFailures(EMAIL, new Date(0))).toBe(4);

    await expect(signIn(EMAIL, TEST_PASSWORD)).rejects.toThrow("NEXT_REDIRECT /");

    expect(await loginAttemptsRepo.countRecentFailures(EMAIL, new Date(0))).toBe(0);
  });
});

describe("signInAction for a user who is not approved", () => {
  const ANA = "ana@x.com";

  it.each([
    ["pending", "Sua conta está aguardando aprovação do administrador"],
    ["rejected", "Seu cadastro não foi aprovado"],
    ["revoked", "Seu acesso foi revogado"],
  ] as const)(
    "with the right password tells a %s user its status, without a session or a recorded failure",
    async (status, message) => {
      const anaId = await insertCredentialUser(ANA, TEST_PASSWORD, status);

      expect(await signIn(ANA, TEST_PASSWORD)).toEqual({ ok: false, error: message });

      expect(redirect).not.toHaveBeenCalled();
      expect(await sessionsOf(anaId)).toBe(0);
      expect(await loginAttemptsRepo.countRecentFailures(ANA, new Date(0))).toBe(0);
    },
  );

  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "with a wrong password records the failure and answers like any wrong password (%s)",
    async (status) => {
      const anaId = await insertCredentialUser(ANA, TEST_PASSWORD, status);

      expect(await signIn(ANA, "senha-errada-000")).toEqual(INVALID);

      expect(await sessionsOf(anaId)).toBe(0);
      expect(await loginAttemptsRepo.countRecentFailures(ANA, new Date(0))).toBe(1);
    },
  );

  it("locks a pending account for 15 minutes after 5 wrong passwords", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    await insertCredentialUser(ANA, TEST_PASSWORD, "pending");
    for (let i = 0; i < 5; i++) expect(await signIn(ANA, "senha-errada-000")).toEqual(INVALID);

    expect(await signIn(ANA, TEST_PASSWORD)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 15 minutos",
    });
  });
});

describe("signOutAction", () => {
  it("ends the session", async () => {
    const { cookie } = await createSignedInUser();
    request.headers = new Headers({ cookie });
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).not.toBeNull();

    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT /login");

    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });
});
