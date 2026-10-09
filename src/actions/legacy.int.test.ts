import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { account, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { legacyRepo } from "@/lib/db/repos/legacy";
import { vaultRepo } from "@/lib/db/repos/vault";
import { category, categoryPercent, financialGoal, subcategory, transaction, userVault } from "@/lib/db/schema";
import { createSignedInUser, signInCookie, TEST_PASSWORD } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { insertLegacyAccount } from "@/test/legacy";
import { commitLegacyMigrationAction, loadLegacyDataAction } from "./legacy";

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
const AUTH_SECRET = "L".repeat(43);

type Payload = Parameters<typeof commitLegacyMigrationAction>[0];

/** A legacy account, signed in, and the session headers for it. */
async function legacyAccount(email = "velha@x.com") {
  const a = await insertLegacyAccount(email);
  const cookie = await signInCookie(email);
  return { ...a, cookie };
}

/** The payload the browser would send for the account, with stand-in ciphertexts. */
async function payloadFor(userId: string, over: Partial<Payload> = {}): Promise<Payload> {
  const res = await legacyRepo.readPlain(userId);
  if (!res.ok) throw new Error("expected legacy");
  const { plain } = res;
  return {
    oldPassword: TEST_PASSWORD,
    authSecret: AUTH_SECRET,
    vault: VAULT,
    pkg: {
      transactions: plain.transactions.map((t) => ({
        id: t.id,
        amountCt: `v1:amount-${t.id}`,
        descriptionCt: t.description === null ? null : `v1:desc-${t.id}`,
      })),
      categories: plain.categories.map((c) => ({
        id: c.id,
        nameCt: `v1:cat-${c.id}`,
        versions: c.versions.map((v) => ({ fromMonth: v.fromMonth, percentCt: `v1:pct-${c.id}-${v.fromMonth}` })),
        subcategories: c.subcategories.map((s) => ({ id: s.id, nameCt: `v1:sub-${s.id}` })),
      })),
      goal: plain.goal && {
        monthlyIncomeCt: "v1:g1",
        savedCt: "v1:g2",
        retirementAgeCt: "v1:g3",
        annualRateCt: "v1:g4",
        withdrawalRateCt: "v1:g5",
      },
      birthDateCt: plain.birthDate && "v1:birth",
    },
    ...over,
  };
}

/** Every column of every row of the user, as stored. */
async function rawRows(userId: string) {
  return {
    transactions: await db.select().from(transaction).where(eq(transaction.userId, userId)),
    categories: await db.select().from(category).where(eq(category.userId, userId)),
    versions: await db
      .select({ v: categoryPercent })
      .from(categoryPercent)
      .innerJoin(category, eq(category.id, categoryPercent.categoryId))
      .where(eq(category.userId, userId)),
    subcategories: await db.select().from(subcategory).where(eq(subcategory.userId, userId)),
    goals: await db.select().from(financialGoal).where(eq(financialGoal.userId, userId)),
    vaults: await db.select().from(userVault).where(eq(userVault.userId, userId)),
    owner: (await db.select().from(user).where(eq(user.id, userId)))[0],
    accounts: await db.select().from(account).where(eq(account.userId, userId)),
  };
}

const signInAs = (cookie: string) => {
  request.headers = new Headers({ cookie });
};

beforeEach(() => {
  request.headers = new Headers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadLegacyDataAction", () => {
  it("answers UNAUTHORIZED without a session and reads nothing", async () => {
    await legacyAccount();
    const readPlain = vi.spyOn(legacyRepo, "readPlain");

    expect(await loadLegacyDataAction()).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(readPlain).not.toHaveBeenCalled();
  });

  it("returns the plain rows of the session user only", async () => {
    const ana = await legacyAccount("ana@x.com");
    const bia = await insertLegacyAccount("bia@x.com");
    signInAs(ana.cookie);

    const result = await loadLegacyDataAction();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.transactions.map((t) => t.id).sort()).toEqual([ana.expenseId, ana.seriesId].sort());
    expect(result.data.transactions.find((t) => t.id === ana.expenseId)).toMatchObject({
      amountCents: 12345,
      description: "Mercado",
    });
    expect(result.data.categories.map((c) => c.name).sort()).toEqual(["Antiga", "Moradia"]);
    expect(result.data.goal).toMatchObject({ monthlyIncomeCents: 1_000_000, retirementAge: 60 });
    expect(result.data.birthDate).toBe("1990-05-17");
    expect(JSON.stringify(result.data)).not.toContain(bia.expenseId);
  });

  it("answers a fixed error for an account that already has a vault, with no data", async () => {
    const sealed = await createSignedInUser("selada@x.com");
    await db.transaction((tx) => vaultRepo.create(tx, sealed.userId, VAULT));
    signInAs(sealed.cookie);

    const result = await loadLegacyDataAction();

    expect(result).toEqual({ ok: false, error: "Esta conta já está protegida" });
  });

  it("answers SAVE_FAILED on a database failure, logging only the code", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(legacyRepo, "readPlain").mockRejectedValue(Object.assign(new Error("segredo"), { code: "53300" }));

    expect(await loadLegacyDataAction()).toEqual({ ok: false, error: SAVE_FAILED });

    expect(log).toHaveBeenCalledWith("loadLegacyDataAction", "53300");
  });
});

describe("commitLegacyMigrationAction", () => {
  it("answers UNAUTHORIZED without a session and writes nothing", async () => {
    const ana = await legacyAccount();
    const before = await rawRows(ana.userId);
    const commit = vi.spyOn(legacyRepo, "commitMigration");

    expect(await commitLegacyMigrationAction(await payloadFor(ana.userId))).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
    });

    expect(commit).not.toHaveBeenCalled();
    expect(await rawRows(ana.userId)).toEqual(before);
  });

  it("migrates: seals the rows, drops the plain text and lets the account sign in with the authSecret", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);

    expect(await commitLegacyMigrationAction(await payloadFor(ana.userId))).toEqual({ ok: true });

    const raw = await rawRows(ana.userId);
    for (const t of raw.transactions) {
      expect(t.amountCents).toBeNull();
      expect(t.description).toBeNull();
      expect(t.amountCt).toBe(`v1:amount-${t.id}`);
    }
    for (const c of raw.categories) expect(c.name).toBeNull();
    for (const { v } of raw.versions) expect(v.percentMicro).toBeNull();
    expect(raw.subcategories[0].name).toBeNull();
    expect(raw.goals[0]).toMatchObject({ monthlyIncomeCents: null, annualRateBp: null, monthlyIncomeCt: "v1:g1" });
    expect(raw.owner.birthDate).toBeNull();
    expect(raw.vaults[0]).toMatchObject({ ...VAULT, birthDateCt: "v1:birth" });
    expect((await auth.api.signInEmail({ body: { email: ana.email, password: AUTH_SECRET } })).user.id).toBe(ana.userId);
    await expect(
      auth.api.signInEmail({ body: { email: ana.email, password: TEST_PASSWORD } }),
    ).rejects.toBeInstanceOf(APIError);
    expect(await legacyRepo.isLegacy(ana.userId)).toBe(false);
  });

  it("answers an error for an account that already has a vault and changes nothing", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const payload = await payloadFor(ana.userId);
    expect(await commitLegacyMigrationAction(payload)).toEqual({ ok: true });
    const before = await rawRows(ana.userId);

    expect(await commitLegacyMigrationAction({ ...payload, oldPassword: AUTH_SECRET })).toEqual({
      ok: false,
      error: "Esta conta já está protegida",
    });

    expect(await rawRows(ana.userId)).toEqual(before);
  });

  it("answers 'Senha incorreta' for a wrong old password and leaves everything intact", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const before = await rawRows(ana.userId);

    expect(await commitLegacyMigrationAction(await payloadFor(ana.userId, { oldPassword: "senha-errada-000" }))).toEqual({
      ok: false,
      error: "Senha incorreta",
    });

    expect(await rawRows(ana.userId)).toEqual(before);
  });

  it("answers SAVE_FAILED for an incomplete package and leaves everything intact", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const before = await rawRows(ana.userId);
    const payload = await payloadFor(ana.userId);
    payload.pkg.transactions = payload.pkg.transactions.slice(1);

    expect(await commitLegacyMigrationAction(payload)).toEqual({ ok: false, error: SAVE_FAILED });

    expect(await rawRows(ana.userId)).toEqual(before);
  });

  it("answers SAVE_FAILED for the package of another account and leaves both intact", async () => {
    const ana = await legacyAccount("ana@x.com");
    const bia = await insertLegacyAccount("bia@x.com");
    signInAs(ana.cookie);
    const beforeAna = await rawRows(ana.userId);
    const beforeBia = await rawRows(bia.userId);

    expect(await commitLegacyMigrationAction(await payloadFor(bia.userId))).toEqual({ ok: false, error: SAVE_FAILED });

    expect(await rawRows(ana.userId)).toEqual(beforeAna);
    expect(await rawRows(bia.userId)).toEqual(beforeBia);
  });

  it.each([
    ["plain text in amountCt", (p: Payload) => void (p.pkg.transactions[0].amountCt = "12345")],
    ["descriptionCt over 2048 characters", (p: Payload) => void (p.pkg.transactions[0].descriptionCt = `v1:${"a".repeat(2046)}`)],
    ["plain text in a category name", (p: Payload) => void (p.pkg.categories[0].nameCt = "Moradia")],
    ["plain text in a percent version", (p: Payload) => void (p.pkg.categories[0].versions[0].percentCt = "30")],
    ["a goal field without ciphertext", (p: Payload) => void (p.pkg.goal = { ...p.pkg.goal!, savedCt: "50000" })],
    ["plain birth date", (p: Payload) => void (p.pkg.birthDateCt = "1990-05-17")],
    ["an authSecret of the wrong size", (p: Payload) => void (p.authSecret = "curto")],
    ["a malformed vault", (p: Payload) => void (p.vault = { ...p.vault, dekWrappedPw: "x" })],
    ["no transactions list", (p: Payload) => void delete (p.pkg as Partial<Payload["pkg"]>).transactions],
    ["no old password", (p: Payload) => void delete (p as Partial<Payload>).oldPassword],
  ])("answers SAVE_FAILED for a package with %s without calling the repository or writing", async (_label, tamper) => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const before = await rawRows(ana.userId);
    const commit = vi.spyOn(legacyRepo, "commitMigration");
    const payload = await payloadFor(ana.userId);
    tamper(payload);

    expect(await commitLegacyMigrationAction(payload)).toEqual({ ok: false, error: SAVE_FAILED });

    expect(commit).not.toHaveBeenCalled();
    expect(await rawRows(ana.userId)).toEqual(before);
  });

  it("answers SAVE_FAILED for a payload that is not an object", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);

    expect(await commitLegacyMigrationAction(null as never)).toEqual({ ok: false, error: SAVE_FAILED });
  });

  it("rolls back and answers SAVE_FAILED when the transaction fails midway, logging only the code", async () => {
    const ana = await legacyAccount();
    signInAs(ana.cookie);
    const before = await rawRows(ana.userId);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    // vaultRepo.create runs inside the transaction, after the sealed columns were already written.
    const payload = await payloadFor(ana.userId);
    vi.spyOn(vaultRepo, "create").mockRejectedValue(Object.assign(new Error("segredo"), { code: "23505" }));

    expect(await commitLegacyMigrationAction(payload)).toEqual({ ok: false, error: SAVE_FAILED });

    expect(log).toHaveBeenCalledWith("commitLegacyMigrationAction", "23505");
    expect(await rawRows(ana.userId)).toEqual(before);
    expect(await legacyRepo.isLegacy(ana.userId)).toBe(true);
  });
});
