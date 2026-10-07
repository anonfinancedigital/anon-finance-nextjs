import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { usersRepo } from "@/lib/db/repos/users";
import { createSignedInUser, insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { signInAction, signOutAction, signUpAction } from "./auth";

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

describe("signUpAction", () => {
  const DUPLICATE = "Este e-mail já está cadastrado";
  const VALID = { name: "  Ana  ", email: " Ana@X.com ", password: "12345678", confirmPassword: "12345678" };
  const MISMATCH = "As senhas não coincidem";

  function signupForm(input: { name: string; email: string; password: string; confirmPassword?: string }) {
    const data = new FormData();
    data.set("name", input.name);
    data.set("email", input.email);
    data.set("password", input.password);
    if (input.confirmPassword !== undefined) data.set("confirmPassword", input.confirmPassword);
    return data;
  }

  /** Confirms the same password unless the case overrides `confirmPassword`. */
  const signUp = (input: Partial<typeof VALID> = {}) =>
    signUpAction(
      undefined,
      signupForm({ ...VALID, confirmPassword: input.password ?? VALID.confirmPassword, ...input }),
    );

  const usersWith = (email: string) => db.select().from(user).where(eq(user.email, email));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a pending user without a session and returns ok", async () => {
    expect(await signUp()).toEqual({ ok: true });

    const [created] = await usersWith("ana@x.com");
    expect(created).toMatchObject({ name: "Ana", email: "ana@x.com", status: "pending" });
    expect(await sessionsOf(created.id)).toBe(0);
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["name", { name: "   " }, "Informe seu nome"],
    ["name", { name: "a".repeat(81) }, "O nome deve ter no máximo 80 caracteres"],
    ["email", { email: "ana@" }, "Informe um e-mail válido"],
    ["password", { password: "1234567" }, "A senha deve ter pelo menos 8 caracteres"],
    ["password", { password: "1".repeat(129) }, "A senha deve ter no máximo 128 caracteres"],
  ] as const)("rejects an invalid %s with %j and creates no user", async (field, input, message) => {
    expect(await signUp(input)).toEqual({ ok: false, error: message, fieldErrors: { [field]: message } });

    expect(await db.$count(user)).toBe(1); // only the user created in beforeEach
  });

  it.each([["12345679"], [""]])("rejects confirmPassword %j with 'As senhas não coincidem' and creates no user", async (confirmPassword) => {
    expect(await signUp({ confirmPassword })).toEqual({
      ok: false,
      error: MISMATCH,
      fieldErrors: { confirmPassword: MISMATCH },
    });

    expect(await db.$count(user)).toBe(1);
  });

  it("rejects a form without confirmPassword and creates no user", async () => {
    const { confirmPassword: _omitted, ...withoutConfirm } = VALID;

    expect(await signUpAction(undefined, signupForm(withoutConfirm))).toEqual({
      ok: false,
      error: MISMATCH,
      fieldErrors: { confirmPassword: MISMATCH },
    });

    expect(await db.$count(user)).toBe(1);
  });

  it.each([["pending"], ["approved"], ["rejected"], ["revoked"]] as const)(
    "rejects an e-mail already used by a %s user, in another case, without changing it",
    async (status) => {
      const existingId = await insertCredentialUser("ana@x.com", TEST_PASSWORD, status);
      const [before] = await usersWith("ana@x.com");

      expect(await signUp({ name: "Outra", email: "ANA@x.COM" })).toEqual({
        ok: false,
        error: DUPLICATE,
        fieldErrors: { email: DUPLICATE },
      });

      const after = await usersWith("ana@x.com");
      expect(after).toEqual([before]);
      expect(after[0].id).toBe(existingId);
    },
  );

  it("returns the save error on a database failure and creates no user", async () => {
    vi.spyOn(usersRepo, "createPending").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await signUp()).toEqual({ ok: false, error: "Não foi possível salvar. Tente novamente" });

    expect(await usersWith("ana@x.com")).toEqual([]);
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
