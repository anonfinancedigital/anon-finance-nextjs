import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { userVault } from "@/lib/db/schema";
import { createSignedInUser, insertCredentialUser, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { signInAction, signOutAction, signUpSealedAction } from "./auth";

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
    ["pending", "Sua conta não está liberada. Fale com o administrador"],
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

describe("signUpSealedAction", () => {
  const AUTH_SECRET = "A".repeat(43);
  const VAULT = {
    kdfVersion: 1,
    salt: "AAAAAAAAAAAAAAAAAAAAAA",
    memKib: 65536,
    iterations: 3,
    parallelism: 1,
    dekWrappedPw: "v1:pw",
    dekWrappedRecovery: "v1:recovery",
  } as const;
  const payload = (over: Record<string, unknown> = {}) =>
    ({
      userId: randomUUID(),
      name: "Ana",
      email: "ana@x.com",
      authSecret: AUTH_SECRET,
      vault: VAULT,
      birthDateCt: "v1:birth",
      ...over,
    }) as Parameters<typeof signUpSealedAction>[0];

  const usersWith = (email: string) => db.select().from(user).where(eq(user.email, email));
  const vaults = () => db.select().from(userVault);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores a pending user, the vault and the sealed birth date, with a hash that verifies the authSecret", async () => {
    const body = payload();

    expect(await signUpSealedAction(body)).toEqual({ ok: true });

    const [created] = await usersWith("ana@x.com");
    expect(created).toMatchObject({ id: body.userId, name: "Ana", status: "pending", birthDate: null });
    expect(await sessionsOf(created.id)).toBe(0);
    const [stored] = await vaults();
    expect(stored).toMatchObject({ userId: body.userId, ...VAULT, birthDateCt: "v1:birth" });
    const [credential] = await db.select().from(account).where(eq(account.userId, body.userId));
    expect(credential.password).not.toBe(AUTH_SECRET);
    expect(await verifyPassword({ hash: credential.password!, password: AUTH_SECRET })).toBe(true);
  });

  it("normalizes the e-mail and lets the approved user sign in with the authSecret as password", async () => {
    const body = payload({ email: "  ANA@x.com " });
    expect(await signUpSealedAction(body)).toEqual({ ok: true });
    expect(await usersWith("ana@x.com")).toHaveLength(1);

    // Signup still creates `pending` users until the open signup lands; approve straight in the table.
    await db.update(user).set({ status: "approved" }).where(eq(user.id, body.userId));

    await expect(signIn("ana@x.com", AUTH_SECRET)).rejects.toThrow("NEXT_REDIRECT /");
    expect(await sessionsOf(body.userId)).toBe(1);
  });

  it("trims the name, stores the normalized e-mail and neither opens a session nor redirects", async () => {
    const body = payload({ name: "  Ana  ", email: " Ana@X.com " });

    expect(await signUpSealedAction(body)).toEqual({ ok: true });

    const [created] = await usersWith("ana@x.com");
    expect(created).toMatchObject({ id: body.userId, name: "Ana", email: "ana@x.com", status: "pending" });
    expect(await sessionsOf(body.userId)).toBe(0);
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([["pending"], ["approved"], ["rejected"], ["revoked"]] as const)(
    "answers an e-mail already used by a %s account, in another case, with the duplicate message without changing it",
    async (status) => {
      const existingId = await insertCredentialUser("ana@x.com", TEST_PASSWORD, status);
      const [before] = await usersWith("ana@x.com");

      expect(await signUpSealedAction(payload({ name: "Outra", email: "ANA@x.COM" }))).toEqual({
        ok: false,
        error: "Este e-mail já está cadastrado",
        fieldErrors: { email: "Este e-mail já está cadastrado" },
      });

      const after = await usersWith("ana@x.com");
      expect(after).toEqual([before]);
      expect(after[0].id).toBe(existingId);
      expect(await vaults()).toEqual([]);
    },
  );

  it("answers a repeated e-mail in another case with the duplicate message and writes nothing", async () => {
    expect(await signUpSealedAction(payload())).toEqual({ ok: true });

    expect(await signUpSealedAction(payload({ email: "ANA@x.COM", name: "Outra" }))).toEqual({
      ok: false,
      error: "Este e-mail já está cadastrado",
      fieldErrors: { email: "Este e-mail já está cadastrado" },
    });

    expect(await usersWith("ana@x.com")).toHaveLength(1);
    expect(await vaults()).toHaveLength(1);
  });

  it.each([
    ["short", "A".repeat(42)],
    ["long", "A".repeat(44)],
    ["outside base64url", `${"A".repeat(42)}+`],
    ["empty", ""],
  ])("refuses an authSecret that is %s and writes nothing", async (_label, authSecret) => {
    const result = await signUpSealedAction(payload({ authSecret }));

    expect(result).toMatchObject({ ok: false, fieldErrors: { authSecret: "Dados inválidos" } });
    expect(await usersWith("ana@x.com")).toEqual([]);
    expect(await vaults()).toEqual([]);
  });

  it.each([
    ["userId that is not a uuid", { userId: "nao-e-uuid" }, "userId"],
    ["empty name", { name: "  " }, "name"],
    ["name over 80 characters", { name: "a".repeat(81) }, "name"],
    ["invalid e-mail", { email: "ana@" }, "email"],
    ["birthDateCt in plain text", { birthDateCt: "1993-09-18" }, "birthDateCt"],
    ["missing birthDateCt", { birthDateCt: undefined }, "birthDateCt"],
    ["dekWrappedPw in plain text", { vault: { ...VAULT, dekWrappedPw: "texto puro" } }, "vault.dekWrappedPw"],
    ["dekWrappedRecovery over 2048 characters", { vault: { ...VAULT, dekWrappedRecovery: `v1:${"a".repeat(2046)}` } }, "vault.dekWrappedRecovery"],
    ["salt of the wrong size", { vault: { ...VAULT, salt: "AAAA" } }, "vault.salt"],
    ["zero iterations", { vault: { ...VAULT, iterations: 0 } }, "vault.iterations"],
    ["memory above the limit", { vault: { ...VAULT, memKib: 2_000_000 } }, "vault.memKib"],
    ["fractional parallelism", { vault: { ...VAULT, parallelism: 1.5 } }, "vault.parallelism"],
    ["unknown kdfVersion", { vault: { ...VAULT, kdfVersion: 2 } }, "vault.kdfVersion"],
    ["missing vault", { vault: undefined }, "vault"],
  ])("refuses a payload with %s and writes nothing", async (_label, over, field) => {
    const result = await signUpSealedAction(payload(over));

    expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: expect.any(String) } });
    expect(await db.$count(user)).toBe(1); // only the user created in beforeEach
    expect(await vaults()).toEqual([]);
  });

  it("refuses a payload that is not an object", async () => {
    const result = await signUpSealedAction(null as never);

    expect(result.ok).toBe(false);
    expect(await vaults()).toEqual([]);
  });

  it("returns the save error on a repeated id, logging only the code, and keeps the first user intact", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = payload();
    expect(await signUpSealedAction(first)).toEqual({ ok: true });

    expect(await signUpSealedAction(payload({ userId: first.userId, email: "outra@x.com" }))).toEqual({
      ok: false,
      error: "Não foi possível salvar. Tente novamente",
    });

    expect(log).toHaveBeenCalledWith("signUpSealedAction", expect.any(String));
    expect(log.mock.calls[0]).toHaveLength(2);
    expect(await usersWith("outra@x.com")).toEqual([]);
    expect(await vaults()).toHaveLength(1);
  });
});
