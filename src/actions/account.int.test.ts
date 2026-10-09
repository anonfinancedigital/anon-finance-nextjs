import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { loginAttemptsRepo } from "@/lib/db/repos/login-attempts";
import { exportRowsSealed } from "@/lib/db/repos/export";
import { vaultRepo } from "@/lib/db/repos/vault";
import { category, categoryPercent, financialGoal, subcategory, transaction, userVault } from "@/lib/db/schema";
import { createSignedInUser, insertCredentialUser, signInCookie } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { deleteAccountAction, exportDataAction } from "./account";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

setupTestDb();

const VAULT = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw",
  dekWrappedRecovery: "v1:recovery",
} as const;

/** A signed-in sealed user with one category (a version, a subcategory), a transaction, a goal and a birth date. */
async function sealedUser(tag: string, email?: string) {
  const signedIn = await createSignedInUser(email);
  const { userId } = signedIn;
  await db.transaction((tx) => vaultRepo.create(tx, userId, VAULT));
  await vaultRepo.setBirthDateSealed(userId, `v1:birth-${tag}`);
  const [cat] = await db.insert(category).values({ userId, nameCt: `v1:cat-${tag}`, color: 1 }).returning();
  await db.insert(categoryPercent).values({ categoryId: cat.id, fromMonth: "2026-01-01", percentCt: `v1:pct-${tag}` });
  await db.insert(subcategory).values({ userId, categoryId: cat.id, nameCt: `v1:sub-${tag}` });
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "expense",
    categoryId: cat.id,
    date: "2026-10-01",
    amountCt: `v1:amount-${tag}`,
    descriptionCt: `v1:desc-${tag}`,
  });
  await db.insert(financialGoal).values({
    userId,
    annualRateBp: null,
    monthlyIncomeCt: `v1:a-${tag}`,
    savedCt: `v1:b-${tag}`,
    retirementAgeCt: `v1:c-${tag}`,
    annualRateCt: `v1:d-${tag}`,
    withdrawalRateCt: `v1:e-${tag}`,
  });
  return { ...signedIn, categoryId: cat.id };
}

const signInAs = (cookie: string) => {
  request.headers = new Headers({ cookie });
};

beforeEach(() => {
  request.headers = new Headers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("exportDataAction", () => {
  it("answers UNAUTHORIZED without a session and reads no row", async () => {
    await sealedUser("ana");
    const spy = vi.spyOn(await import("@/lib/db/repos/export"), "exportRowsSealed");

    expect(await exportDataAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(spy).not.toHaveBeenCalled();
  });

  it("answers UNAUTHORIZED when the session user is no longer approved", async () => {
    const ana = await sealedUser("ana");
    const { user } = await import("@/lib/db/auth-schema");
    const { eq } = await import("drizzle-orm");
    await db.update(user).set({ status: "revoked" }).where(eq(user.id, ana.userId));
    signInAs(ana.cookie);

    expect(await exportDataAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  it("returns only the rows of the session user when two users have data", async () => {
    const ana = await sealedUser("ana", "ana@x.com");
    const bia = await sealedUser("bia", "bia@x.com");
    signInAs(ana.cookie);

    const result = await exportDataAction();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(await exportRowsSealed(ana.userId));
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.transactions[0]).toMatchObject({ amountCt: "v1:amount-ana", descriptionCt: "v1:desc-ana" });
    expect(result.data.categories).toHaveLength(1);
    expect(result.data.categories[0]).toMatchObject({
      id: ana.categoryId,
      nameCt: "v1:cat-ana",
      versions: [{ fromMonth: "2026-01-01", percentCt: "v1:pct-ana" }],
      subcategories: [{ id: expect.any(String), nameCt: "v1:sub-ana" }],
    });
    expect(result.data.goal).toMatchObject({ monthlyIncomeCt: "v1:a-ana" });
    expect(result.data.birthDateCt).toBe("v1:birth-ana");
    expect(JSON.stringify(result.data)).not.toContain("bia");
    expect(JSON.stringify(result.data)).not.toContain(bia.categoryId);
  });

  it("carries only ciphertext: every sensitive field is v1:... and legacy plain rows are left out", async () => {
    const ana = await sealedUser("ana");
    const [legacyCat] = await db
      .insert(category)
      .values({ userId: ana.userId, name: "Moradia legada", color: 2 })
      .returning();
    await db.insert(transaction).values({
      id: randomUUID(),
      userId: ana.userId,
      kind: "expense",
      categoryId: legacyCat.id,
      date: "2026-10-02",
      amountCents: 99999,
      description: "Mercado legado",
    });
    signInAs(ana.cookie);

    const result = await exportDataAction();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.data);
    expect(json).not.toContain("Moradia legada");
    expect(json).not.toContain("Mercado legado");
    expect(json).not.toContain("99999");
    for (const t of result.data.transactions) expect(t.amountCt).toMatch(/^v1:/);
    for (const c of result.data.categories) expect(c.nameCt).toMatch(/^v1:/);
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.categories).toHaveLength(1);
  });

  it("answers SAVE_FAILED on a database failure, logging only the code", async () => {
    const ana = await sealedUser("ana");
    signInAs(ana.cookie);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = await import("@/lib/db/repos/export");
    vi.spyOn(repo, "exportRowsSealed").mockRejectedValue(Object.assign(new Error("segredo"), { code: "57P01" }));

    expect(await exportDataAction()).toEqual({ ok: false, error: SAVE_FAILED });

    expect(log).toHaveBeenCalledWith("exportDataAction", "57P01");
  });
});

describe("deleteAccountAction", () => {
  const SECRET = "S".repeat(43);
  const WRONG = "W".repeat(43);
  const ADMIN = process.env.ADMIN_EMAIL!;

  /** A sealed account whose credential hash is that of SECRET, signed in. */
  async function sealedWithSecret(tag: string, email: string) {
    const userId = await insertCredentialUser(email, SECRET);
    const cookie = await signInCookie(email, SECRET);
    await db.transaction((tx) => vaultRepo.create(tx, userId, VAULT));
    await vaultRepo.setBirthDateSealed(userId, `v1:birth-${tag}`);
    const [cat] = await db.insert(category).values({ userId, nameCt: `v1:cat-${tag}`, color: 1 }).returning();
    await db.insert(categoryPercent).values({ categoryId: cat.id, fromMonth: "2026-01-01", percentCt: `v1:p-${tag}` });
    await db.insert(subcategory).values({ userId, categoryId: cat.id, nameCt: `v1:s-${tag}` });
    await db.insert(transaction).values({
      id: randomUUID(),
      userId,
      kind: "expense",
      categoryId: cat.id,
      date: "2026-10-01",
      amountCt: `v1:amount-${tag}`,
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
    return { userId, email, cookie };
  }

  /** Rows of the user in every table that can hold them. */
  async function rowsOf(userId: string, categoryId?: string) {
    return {
      user: await db.$count(user, eq(user.id, userId)),
      account: await db.$count(account, eq(account.userId, userId)),
      session: await db.$count(session, eq(session.userId, userId)),
      vault: await db.$count(userVault, eq(userVault.userId, userId)),
      transaction: await db.$count(transaction, eq(transaction.userId, userId)),
      category: await db.$count(category, eq(category.userId, userId)),
      subcategory: await db.$count(subcategory, eq(subcategory.userId, userId)),
      percent: categoryId ? await db.$count(categoryPercent, eq(categoryPercent.categoryId, categoryId)) : 0,
      goal: await db.$count(financialGoal, eq(financialGoal.userId, userId)),
    };
  }
  const ZERO = { user: 0, account: 0, session: 0, vault: 0, transaction: 0, category: 0, subcategory: 0, percent: 0, goal: 0 };

  it("answers UNAUTHORIZED without a session and deletes nothing", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");

    expect(await deleteAccountAction(SECRET)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect((await rowsOf(ana.userId)).user).toBe(1);
  });

  it("with the right secret leaves no row of the user in any table and ends the session", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");
    const bia = await sealedWithSecret("bia", "bia@x.com");
    const [anaCat] = await db.select().from(category).where(eq(category.userId, ana.userId));
    const biaBefore = await rowsOf(bia.userId);
    await loginAttemptsRepo.recordFailure("ana@x.com");
    signInAs(ana.cookie);

    expect(await deleteAccountAction(SECRET)).toEqual({ ok: true });

    expect(await rowsOf(ana.userId, anaCat.id)).toEqual(ZERO);
    expect(await loginAttemptsRepo.latestFailure("ana@x.com")).toBeNull();
    expect(await rowsOf(bia.userId)).toEqual(biaBefore);
    expect(biaBefore).toMatchObject({ user: 1, vault: 1, transaction: 1, category: 1, goal: 1 });
    // The session cookie no longer opens anything.
    expect(await deleteAccountAction(SECRET)).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  it("with a wrong secret answers 'Senha incorreta', records a failure and deletes nothing", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");
    const before = await rowsOf(ana.userId);
    signInAs(ana.cookie);

    expect(await deleteAccountAction(WRONG)).toEqual({ ok: false, error: "Senha incorreta" });

    expect(await rowsOf(ana.userId)).toEqual(before);
    expect(await loginAttemptsRepo.countRecentFailures("ana@x.com", new Date(Date.now() - 60_000))).toBe(1);
  });

  it("refuses the administrator with the fixed message and deletes nothing", async () => {
    const admin = await sealedWithSecret("admin", ADMIN);
    const before = await rowsOf(admin.userId);
    signInAs(admin.cookie);

    expect(await deleteAccountAction(SECRET)).toEqual({
      ok: false,
      error: "Não é possível revogar ou excluir o administrador",
    });

    expect(await rowsOf(admin.userId)).toEqual(before);
  });

  it("locks after 5 failures in 15 minutes, refusing even the right secret", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");
    signInAs(ana.cookie);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    for (let i = 0; i < 5; i++) expect(await deleteAccountAction(WRONG)).toEqual({ ok: false, error: "Senha incorreta" });

    expect(await deleteAccountAction(SECRET)).toEqual({
      ok: false,
      error: "Muitas tentativas. Tente novamente em 15 minutos",
    });
    expect((await rowsOf(ana.userId)).user).toBe(1);

    vi.setSystemTime(new Date("2026-10-04T12:15:01Z"));
    expect(await deleteAccountAction(SECRET)).toEqual({ ok: true });
    expect((await rowsOf(ana.userId)).user).toBe(0);
    vi.useRealTimers();
  });

  it("shares the lock with the login failures of the same e-mail", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");
    signInAs(ana.cookie);
    for (let i = 0; i < 5; i++) await loginAttemptsRepo.recordFailure("ana@x.com");

    expect(await deleteAccountAction(SECRET)).toMatchObject({ ok: false, error: expect.stringContaining("Muitas tentativas") });
    expect((await rowsOf(ana.userId)).user).toBe(1);
  });

  it.each([["short", "S".repeat(42)], ["empty", ""], ["not a string", 123 as unknown as string]])(
    "refuses a %s secret as malformed, without recording a failure or deleting",
    async (_label, secret) => {
      const ana = await sealedWithSecret("ana", "ana@x.com");
      signInAs(ana.cookie);

      expect((await deleteAccountAction(secret)).ok).toBe(false);

      expect((await rowsOf(ana.userId)).user).toBe(1);
      expect(await loginAttemptsRepo.latestFailure("ana@x.com")).toBeNull();
    },
  );

  it("answers SAVE_FAILED on a database failure, logging only the code, and keeps the account", async () => {
    const ana = await sealedWithSecret("ana", "ana@x.com");
    signInAs(ana.cookie);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { usersRepo } = await import("@/lib/db/repos/users");
    vi.spyOn(usersRepo, "remove").mockRejectedValue(Object.assign(new Error("segredo"), { code: "40P01" }));

    expect(await deleteAccountAction(SECRET)).toEqual({ ok: false, error: SAVE_FAILED });

    expect(log).toHaveBeenCalledWith("deleteAccountAction", "40P01");
    expect((await rowsOf(ana.userId)).user).toBe(1);
  });
});
