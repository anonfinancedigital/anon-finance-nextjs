import { randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { account, session, user, verification } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { vaultRepo } from "@/lib/db/repos/vault";
import {
  category,
  financialGoal,
  transaction,
  userVault,
} from "@/lib/db/schema";
import {
  createSignedInUser,
  insertCredentialUser,
  signInCookie,
  TEST_PASSWORD,
} from "@/test/auth";
import { setupTestDb } from "@/test/db";
import {
  getResetVaultAction,
  requestPasswordResetAction,
  resetPasswordAction,
  resetPasswordSealedAction,
} from "./password-reset";

// Tasks scheduled with `after` are kept so the test can wait for them, as the response would.
const scheduled = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }));

vi.mock("next/server", () => ({
  after: vi.fn((task: (() => unknown) | Promise<unknown>) => {
    scheduled.tasks.push(
      Promise.resolve(typeof task === "function" ? task() : task),
    );
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/mailer", () => ({ sendMail: vi.fn(async () => {}) }));
// Real hashing, wrapped so a test can force one call to fail.
vi.mock("better-auth/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/crypto")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});

const { sendMail } = await import("@/lib/mailer");
const { redirect } = await import("next/navigation");

setupTestDb();

const EMAIL = "ana@x.com";
const BASE_URL = process.env.BETTER_AUTH_URL!;
const NOT_APPROVED = [["pending"], ["rejected"], ["revoked"]] as const;
const INVALID_EMAIL = {
  ok: false,
  error: "Informe um e-mail válido",
  fieldErrors: { email: "Informe um e-mail válido" },
};

/** Calls the action and waits for the work scheduled with `after`. */
async function request(email: string) {
  const data = new FormData();
  data.set("email", email);
  const result = await requestPasswordResetAction(undefined, data);
  await Promise.all(scheduled.tasks);
  return result;
}

/** The raw token carried by the link of the n-th e-mail sent. */
function tokenOfMail(n = 0) {
  const { text } = vi.mocked(sendMail).mock.calls[n][0];
  const match = text.match(/\/redefinir-senha\?token=(\S+)/);
  if (!match) throw new Error("no reset link in the e-mail");
  return decodeURIComponent(match[1]);
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scheduled.tasks = [];
  vi.mocked(sendMail).mockReset().mockResolvedValue(undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("requestPasswordResetAction", () => {
  it("sends one e-mail with a working link to an approved account, matched after trim and lower case", async () => {
    await insertCredentialUser(EMAIL);

    const result = await request("  ANA@X.com ");

    expect(result).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendMail).mock.calls[0][0];
    expect(mail.to).toBe(EMAIL);
    expect(mail.subject).toBe("Redefinir sua senha");
    expect(mail.text).toContain(`${BASE_URL}/redefinir-senha?token=`);
    expect(await passwordResetsRepo.isValid(tokenOfMail())).toBe(true);
  });

  it("sends nothing to an e-mail without account and answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);

    expect(await request("bia@x.com")).toEqual({ ok: true });
    expect(sendMail).not.toHaveBeenCalled();
    expect(await db.$count(verification)).toBe(0);
  });

  it.each(NOT_APPROVED)(
    "sends nothing to a %s account and answers like the approved case",
    async (status) => {
      await insertCredentialUser(EMAIL, undefined, status);

      expect(await request(EMAIL)).toEqual({ ok: true });
      expect(sendMail).not.toHaveBeenCalled();
      expect(await db.$count(verification)).toBe(0);
    },
  );

  it.each([[""], ["ana-sem-arroba"]])(
    "refuses the e-mail %j with the exact message and sends nothing",
    async (email) => {
      await insertCredentialUser(EMAIL);

      expect(await request(email)).toEqual(INVALID_EMAIL);
      expect(sendMail).not.toHaveBeenCalled();
      expect(await db.$count(verification)).toBe(0);
    },
  );

  it("logs a failed delivery with only the action and the error code, and still answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);
    const failure = Object.assign(new Error("SMTP fora do ar"), {
      code: "ECONNREFUSED",
    });
    vi.mocked(sendMail).mockRejectedValue(failure);

    expect(await request(EMAIL)).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls).toEqual([
      ["requestPasswordResetAction: sendMail", "ECONNREFUSED"],
    ]);
  });

  it("logs a repository failure with only the action and the error code, and still answers like the approved case", async () => {
    await insertCredentialUser(EMAIL);
    const failure = Object.assign(new Error("banco fora do ar"), {
      code: "08006",
    });
    vi.spyOn(passwordResetsRepo, "issue").mockRejectedValue(failure);

    expect(await request(EMAIL)).toEqual({ ok: true });
    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleError.mock.calls).toEqual([
      ["requestPasswordResetAction", "08006"],
    ]);
  });

  it("invalidates the first link when a second one is requested", async () => {
    await insertCredentialUser(EMAIL);

    await request(EMAIL);
    await request(EMAIL);

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(await passwordResetsRepo.isValid(tokenOfMail(0))).toBe(false);
    expect(await passwordResetsRepo.isValid(tokenOfMail(1))).toBe(true);
  });
});

describe("resetPasswordAction", () => {
  const NEW_PASSWORD = "nova-senha-456";
  const LENGTH = "A senha deve ter entre 8 e 128 caracteres";
  const MISMATCH = "As senhas não coincidem";
  const INVALID_LINK = { ok: false, error: "Link inválido ou expirado" };

  let userId: string;

  beforeEach(async () => {
    vi.mocked(redirect).mockClear();
    userId = await insertCredentialUser(EMAIL);
  });

  function reset(token: string, password: string, confirmPassword = password) {
    const data = new FormData();
    data.set("token", token);
    data.set("password", password);
    data.set("confirmPassword", confirmPassword);
    return resetPasswordAction(undefined, data);
  }

  async function issueToken() {
    const issued = await passwordResetsRepo.issue(EMAIL);
    if (!issued) throw new Error("no token issued");
    return issued.token;
  }

  const passwordHashOf = async (id: string) => {
    const [row] = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, id), eq(account.providerId, "credential")));
    return row.password;
  };

  const sessionsOf = (id: string) => db.$count(session, eq(session.userId, id));

  const signIn = (password: string) =>
    auth.api.signInEmail({ body: { email: EMAIL, password } });

  it("replaces the password, ends every session, opens none and redirects to /login", async () => {
    await signInCookie(EMAIL);
    await signInCookie(EMAIL);
    const token = await issueToken();

    await expect(reset(token, NEW_PASSWORD)).rejects.toThrow(
      "NEXT_REDIRECT /login",
    );

    expect(redirect).toHaveBeenCalledWith("/login");
    // No session row left or created: no session cookie can be valid after the reset.
    expect(await sessionsOf(userId)).toBe(0);
    await expect(signIn(TEST_PASSWORD)).rejects.toBeInstanceOf(APIError);
    expect((await signIn(NEW_PASSWORD)).user.id).toBe(userId);
  });

  it.each([[7], [129]])(
    "refuses a password of %i characters and keeps the token usable",
    async (size) => {
      const token = await issueToken();
      const before = await passwordHashOf(userId);

      expect(await reset(token, "a".repeat(size))).toEqual({
        ok: false,
        error: LENGTH,
        fieldErrors: { password: LENGTH },
      });
      expect(await passwordHashOf(userId)).toBe(before);

      await expect(reset(token, NEW_PASSWORD)).rejects.toThrow(
        "NEXT_REDIRECT /login",
      );
      expect((await signIn(NEW_PASSWORD)).user.id).toBe(userId);
    },
  );

  it("refuses a different confirmation and keeps the token valid", async () => {
    const token = await issueToken();
    const before = await passwordHashOf(userId);

    expect(await reset(token, NEW_PASSWORD, "outra-senha-789")).toEqual({
      ok: false,
      error: MISMATCH,
      fieldErrors: { confirmPassword: MISMATCH },
    });
    expect(await passwordHashOf(userId)).toBe(before);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });

  it("refuses an unknown token without changing the password", async () => {
    const before = await passwordHashOf(userId);

    expect(await reset("token-desconhecido", NEW_PASSWORD)).toEqual(
      INVALID_LINK,
    );
    expect(await passwordHashOf(userId)).toBe(before);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refuses an empty token without changing the password", async () => {
    const before = await passwordHashOf(userId);

    expect(await reset("", NEW_PASSWORD)).toMatchObject(INVALID_LINK);
    expect(await passwordHashOf(userId)).toBe(before);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refuses an expired token without changing the password", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T12:00:00.000Z"));
    const token = await issueToken();
    const before = await passwordHashOf(userId);
    vi.setSystemTime(Date.now() + 30 * 60_000 + 1000);

    expect(await reset(token, NEW_PASSWORD)).toEqual(INVALID_LINK);
    expect(await passwordHashOf(userId)).toBe(before);
  });

  it("refuses a token already used and keeps the password set with it", async () => {
    const token = await issueToken();
    await expect(reset(token, NEW_PASSWORD)).rejects.toThrow(
      "NEXT_REDIRECT /login",
    );
    const afterFirstUse = await passwordHashOf(userId);

    expect(await reset(token, "terceira-senha-000")).toEqual(INVALID_LINK);
    expect(await passwordHashOf(userId)).toBe(afterFirstUse);
    expect((await signIn(NEW_PASSWORD)).user.id).toBe(userId);
  });

  it("refuses a token replaced by a newer request without changing the password", async () => {
    const older = await issueToken();
    await issueToken();
    const before = await passwordHashOf(userId);

    expect(await reset(older, NEW_PASSWORD)).toEqual(INVALID_LINK);
    expect(await passwordHashOf(userId)).toBe(before);
  });

  it.each(NOT_APPROVED)(
    "refuses the token of an account that became %s after the request",
    async (status) => {
      const token = await issueToken();
      const before = await passwordHashOf(userId);
      await db.update(user).set({ status }).where(eq(user.id, userId));

      expect(await reset(token, NEW_PASSWORD)).toEqual(INVALID_LINK);
      expect(await passwordHashOf(userId)).toBe(before);
    },
  );

  it("answers SAVE_FAILED on an unexpected failure and keeps the token valid", async () => {
    const token = await issueToken();
    const before = await passwordHashOf(userId);
    vi.mocked(hashPassword).mockRejectedValueOnce(new Error("hash falhou"));

    expect(await reset(token, NEW_PASSWORD)).toEqual({
      ok: false,
      error: SAVE_FAILED,
    });
    expect(await passwordHashOf(userId)).toBe(before);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
    // Only the action name and the code: the error object and its message stay out of the log.
    expect(consoleError.mock.calls).toEqual([["resetPasswordAction", "unknown"]]);
  });
});

describe("sealed reset actions", () => {
  const OLD_VAULT = {
    kdfVersion: 1,
    salt: "AAAAAAAAAAAAAAAAAAAAAA",
    memKib: 65536,
    iterations: 3,
    parallelism: 1,
    dekWrappedPw: "v1:old-pw",
    dekWrappedRecovery: "v1:old-recovery",
  } as const;
  const NEW_VAULT = {
    kdfVersion: 1,
    salt: "BBBBBBBBBBBBBBBBBBBBBB",
    memKib: 32768,
    iterations: 2,
    parallelism: 2,
    dekWrappedPw: "v1:new-pw",
    dekWrappedRecovery: "v1:new-recovery",
  } as const;
  const NEW_SECRET = "N".repeat(43);
  const INVALID_LINK = { ok: false, error: "Link inválido ou expirado" };
  const rewrap = (token: string, over: Record<string, unknown> = {}) =>
    ({
      mode: "rewrap",
      token,
      authSecret: NEW_SECRET,
      salt: NEW_VAULT.salt,
      params: { memKib: 32768, iterations: 2, parallelism: 2 },
      dekWrappedPw: "v1:rewrapped-pw",
      ...over,
    }) as Parameters<typeof resetPasswordSealedAction>[0];
  const wipe = (token: string, over: Record<string, unknown> = {}) =>
    ({
      mode: "wipe",
      token,
      authSecret: NEW_SECRET,
      vault: NEW_VAULT,
      ...over,
    }) as Parameters<typeof resetPasswordSealedAction>[0];

  async function sealedAccount() {
    const { userId } = await createSignedInUser(EMAIL);
    await db.transaction((tx) => vaultRepo.create(tx, userId, OLD_VAULT));
    await vaultRepo.setBirthDateSealed(userId, "v1:birth");
    const [cat] = await db
      .insert(category)
      .values({ userId, nameCt: "v1:cat", color: 1 })
      .returning();
    await db.insert(transaction).values({
      id: randomUUID(),
      userId,
      kind: "expense",
      categoryId: cat.id,
      date: "2026-10-01",
      amountCt: "v1:amount",
    });
    await db.insert(financialGoal).values({
      userId,
      annualRateBp: null,
      monthlyIncomeCt: "v1:a",
      savedCt: "v1:b",
      retirementAgeCt: "v1:c",
      annualRateCt: "v1:d",
      withdrawalRateCt: "v1:e",
    });
    const issued = await passwordResetsRepo.issue(EMAIL);
    return { userId, token: issued!.token };
  }

  const hashOf = async (id: string) =>
    (await db.select().from(account).where(eq(account.userId, id)))[0]
      .password!;
  const vaultOf = async (id: string) =>
    (await db.select().from(userVault).where(eq(userVault.userId, id)))[0];
  const counts = async (id: string) => ({
    transactions: await db.$count(transaction, eq(transaction.userId, id)),
    categories: await db.$count(category, eq(category.userId, id)),
    goals: await db.$count(financialGoal, eq(financialGoal.userId, id)),
  });
  const sessionsOf = (id: string) => db.$count(session, eq(session.userId, id));

  it("getResetVaultAction returns only the owner id and dekWrappedRecovery for a valid token and does not consume it", async () => {
    const { userId, token } = await sealedAccount();

    const result = await getResetVaultAction(token);

    expect(result).toEqual({
      ok: true,
      userId,
      dekWrappedRecovery: "v1:old-recovery",
    });
    expect(Object.keys(result).sort()).toEqual([
      "dekWrappedRecovery",
      "ok",
      "userId",
    ]);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });

  it.each([
    ["unknown", "token-desconhecido"],
    ["empty", ""],
  ])(
    "getResetVaultAction answers an invalid link for an %s token",
    async (_label, token) => {
      await sealedAccount();
      expect(await getResetVaultAction(token)).toEqual(INVALID_LINK);
    },
  );

  it("getResetVaultAction answers an invalid link for an expired token and a used one", async () => {
    const { token } = await sealedAccount();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect(await getResetVaultAction(token)).toEqual(INVALID_LINK);
    vi.useRealTimers();

    expect(await resetPasswordSealedAction(rewrap(token))).toEqual({
      ok: true,
    });
    expect(await getResetVaultAction(token)).toEqual(INVALID_LINK);
  });

  it("getResetVaultAction answers only legacy for a valid token of an approved account without vault, and does not consume it", async () => {
    await insertCredentialUser("velho@x.com");
    const legacy = await passwordResetsRepo.issue("velho@x.com");

    const result = await getResetVaultAction(legacy!.token);

    expect(result).toEqual({ ok: true, legacy: true });
    expect(Object.keys(result).sort()).toEqual(["legacy", "ok"]);
    expect(await passwordResetsRepo.isValid(legacy!.token)).toBe(true);
  });

  it("getResetVaultAction answers an invalid link for a legacy account that is no longer approved, and for its expired token", async () => {
    const id = await insertCredentialUser("velho@x.com");
    const legacy = await passwordResetsRepo.issue("velho@x.com");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    expect(await getResetVaultAction(legacy!.token)).toEqual(INVALID_LINK);
    vi.useRealTimers();

    await db.update(user).set({ status: "revoked" }).where(eq(user.id, id));
    expect(await getResetVaultAction(legacy!.token)).toEqual(INVALID_LINK);
  });

  it("a legacy account told legacy resets with resetPasswordAction: new password signs in, old one does not, sessions end, no vault is created and the link is used", async () => {
    const legacyEmail = "velho@x.com";
    const id = await insertCredentialUser(legacyEmail);
    await signInCookie(legacyEmail);
    const legacy = await passwordResetsRepo.issue(legacyEmail);
    expect(await getResetVaultAction(legacy!.token)).toEqual({
      ok: true,
      legacy: true,
    });

    const data = new FormData();
    data.set("token", legacy!.token);
    data.set("password", "nova-senha-456");
    data.set("confirmPassword", "nova-senha-456");
    await expect(resetPasswordAction(undefined, data)).rejects.toThrow(
      "NEXT_REDIRECT /login",
    );

    expect(await sessionsOf(id)).toBe(0);
    expect(await vaultOf(id)).toBeUndefined();
    const signIn = (password: string) =>
      auth.api.signInEmail({ body: { email: legacyEmail, password } });
    await expect(signIn(TEST_PASSWORD)).rejects.toBeInstanceOf(APIError);
    expect((await signIn("nova-senha-456")).user.id).toBe(id);
    expect(await getResetVaultAction(legacy!.token)).toEqual(INVALID_LINK);
  });

  it("getResetVaultAction answers SAVE_FAILED on a database failure, logging only the code", async () => {
    vi.spyOn(passwordResetsRepo, "recoveryMaterialFor").mockRejectedValue(
      Object.assign(new Error("segredo"), { code: "08006" }),
    );

    expect(await getResetVaultAction("qualquer")).toEqual({
      ok: false,
      error: SAVE_FAILED,
    });
    expect(consoleError).toHaveBeenCalledWith("getResetVaultAction", "08006");
  });

  it("rewrap swaps the secret and the password-wrapped DEK, keeps the data and ends the sessions", async () => {
    const { userId, token } = await sealedAccount();
    const before = await counts(userId);

    expect(await resetPasswordSealedAction(rewrap(token))).toEqual({
      ok: true,
    });

    expect(
      await verifyPassword({
        hash: await hashOf(userId),
        password: NEW_SECRET,
      }),
    ).toBe(true);
    expect(await vaultOf(userId)).toMatchObject({
      salt: NEW_VAULT.salt,
      memKib: 32768,
      iterations: 2,
      parallelism: 2,
      dekWrappedPw: "v1:rewrapped-pw",
      dekWrappedRecovery: "v1:old-recovery",
      birthDateCt: "v1:birth",
    });
    expect(await counts(userId)).toEqual(before);
    expect(before).toEqual({ transactions: 1, categories: 1, goals: 1 });
    expect(await sessionsOf(userId)).toBe(0);
    expect(await passwordResetsRepo.isValid(token)).toBe(false);
  });

  it("wipe erases the financial data, replaces the whole vault and the secret", async () => {
    const { userId, token } = await sealedAccount();

    expect(await resetPasswordSealedAction(wipe(token))).toEqual({ ok: true });

    expect(await counts(userId)).toEqual({
      transactions: 0,
      categories: 0,
      goals: 0,
    });
    expect(await vaultOf(userId)).toMatchObject({
      ...NEW_VAULT,
      birthDateCt: null,
    });
    expect(
      await verifyPassword({
        hash: await hashOf(userId),
        password: NEW_SECRET,
      }),
    ).toBe(true);
    expect(await sessionsOf(userId)).toBe(0);
    expect(await passwordResetsRepo.isValid(token)).toBe(false);
  });

  it("lets the user sign in with the new secret after a reset and not with the old password", async () => {
    const { userId, token } = await sealedAccount();
    await resetPasswordSealedAction(rewrap(token));

    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: TEST_PASSWORD } }),
    ).rejects.toBeInstanceOf(APIError);
    expect(
      (
        await auth.api.signInEmail({
          body: { email: EMAIL, password: NEW_SECRET },
        })
      ).user.id,
    ).toBe(userId);
  });

  it.each([
    [
      "rewrap with a short authSecret",
      (t: string) => rewrap(t, { authSecret: "curto" }),
      "authSecret",
    ],
    [
      "rewrap with a salt of the wrong size",
      (t: string) => rewrap(t, { salt: "AAAA" }),
      "salt",
    ],
    [
      "rewrap with plain-text dekWrappedPw",
      (t: string) => rewrap(t, { dekWrappedPw: "texto puro" }),
      "dekWrappedPw",
    ],
    [
      "rewrap with iterations 0",
      (t: string) =>
        rewrap(t, { params: { memKib: 32768, iterations: 0, parallelism: 2 } }),
      "params.iterations",
    ],
    [
      "rewrap without params",
      (t: string) => rewrap(t, { params: undefined }),
      "params",
    ],
    [
      "wipe with a malformed recovery DEK",
      (t: string) =>
        wipe(t, { vault: { ...NEW_VAULT, dekWrappedRecovery: "x" } }),
      "vault.dekWrappedRecovery",
    ],
    [
      "wipe with a wrong kdfVersion",
      (t: string) => wipe(t, { vault: { ...NEW_VAULT, kdfVersion: 2 } }),
      "vault.kdfVersion",
    ],
    [
      "wipe with a long authSecret",
      (t: string) => wipe(t, { authSecret: "N".repeat(44) }),
      "authSecret",
    ],
  ])(
    "refuses %s, changing nothing and keeping the token valid",
    async (_label, build, field) => {
      const { userId, token } = await sealedAccount();
      const hash = await hashOf(userId);

      expect(await resetPasswordSealedAction(build(token))).toMatchObject({
        ok: false,
        fieldErrors: { [field]: expect.any(String) },
      });

      expect(await hashOf(userId)).toBe(hash);
      expect(await vaultOf(userId)).toMatchObject({
        ...OLD_VAULT,
        birthDateCt: "v1:birth",
      });
      expect(await counts(userId)).toEqual({
        transactions: 1,
        categories: 1,
        goals: 1,
      });
      expect(await sessionsOf(userId)).toBe(1);
      expect(await passwordResetsRepo.isValid(token)).toBe(true);
    },
  );

  it("refuses an unknown mode and a missing token without touching the account", async () => {
    const { userId, token } = await sealedAccount();
    const hash = await hashOf(userId);

    expect(
      await resetPasswordSealedAction({
        ...rewrap(token),
        mode: "outro",
      } as never),
    ).toMatchObject({
      ok: false,
    });
    expect(await resetPasswordSealedAction(rewrap("", {}))).toMatchObject({
      ok: false,
      error: "Link inválido ou expirado",
    });
    expect(await resetPasswordSealedAction(null as never)).toMatchObject({
      ok: false,
    });

    expect(await hashOf(userId)).toBe(hash);
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });

  it.each([["rewrap" as const], ["wipe" as const]])(
    "%s with an unknown token answers an invalid link and changes nothing",
    async (mode) => {
      const { userId } = await sealedAccount();
      const hash = await hashOf(userId);
      const body =
        mode === "rewrap" ? rewrap("desconhecido") : wipe("desconhecido");

      expect(await resetPasswordSealedAction(body)).toEqual(INVALID_LINK);

      expect(await hashOf(userId)).toBe(hash);
      expect(await counts(userId)).toEqual({
        transactions: 1,
        categories: 1,
        goals: 1,
      });
    },
  );

  it("refuses a token already used", async () => {
    const { token } = await sealedAccount();
    expect(await resetPasswordSealedAction(rewrap(token))).toEqual({
      ok: true,
    });

    expect(await resetPasswordSealedAction(rewrap(token))).toEqual(
      INVALID_LINK,
    );
  });

  it("answers SAVE_FAILED via logActionError on a database failure and keeps the token valid", async () => {
    const { userId, token } = await sealedAccount();
    const hash = await hashOf(userId);
    vi.mocked(hashPassword).mockRejectedValueOnce(
      Object.assign(new Error("segredo"), { code: "XX000" }),
    );

    expect(await resetPasswordSealedAction(wipe(token))).toEqual({
      ok: false,
      error: SAVE_FAILED,
    });

    expect(consoleError).toHaveBeenCalledWith(
      "resetPasswordSealedAction",
      "XX000",
    );
    expect(await hashOf(userId)).toBe(hash);
    expect(await counts(userId)).toEqual({
      transactions: 1,
      categories: 1,
      goals: 1,
    });
    expect(await passwordResetsRepo.isValid(token)).toBe(true);
  });
});
