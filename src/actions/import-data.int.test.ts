import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { db } from "@/lib/db/client";
import { importRepo } from "@/lib/db/repos/import";
import { vaultRepo } from "@/lib/db/repos/vault";
import { category, financialGoal, subcategory, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import type { ImportPayload } from "@/lib/vault/types";
import { importDataAction } from "./import-data";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const NOT_EMPTY = "Só é possível importar em uma conta sem transações nem categorias";

const VAULT = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw",
  dekWrappedRecovery: "v1:recovery",
} as const;

const goal = (tag: string) => ({
  monthlyIncomeCt: `v1:${tag}-1`,
  savedCt: `v1:${tag}-2`,
  retirementAgeCt: `v1:${tag}-3`,
  annualRateCt: `v1:${tag}-4`,
  withdrawalRateCt: `v1:${tag}-5`,
});

function payload(tag: string): ImportPayload {
  const cat = randomUUID();
  const sub = randomUUID();
  return {
    categories: [
      {
        id: cat,
        color: 3,
        isInvestment: false,
        deletedFrom: null,
        nameCt: `v1:${tag}-cat`,
        versions: [{ fromMonth: "0001-01-01", percentCt: `v1:${tag}-pct` }],
        subcategories: [{ id: sub, nameCt: `v1:${tag}-sub` }],
      },
    ],
    transactions: [
      { id: randomUUID(), kind: "expense", date: "2026-10-05", categoryId: cat, subcategoryId: sub, amountCt: `v1:${tag}-a1`, descriptionCt: `v1:${tag}-d1`, recurring: false, recurrenceDay: null, recurrenceEnd: null, seriesId: null },
      { id: randomUUID(), kind: "income", date: "2026-10-01", categoryId: null, subcategoryId: null, amountCt: `v1:${tag}-a2`, descriptionCt: null, recurring: false, recurrenceDay: null, recurrenceEnd: null, seriesId: null },
    ],
    goal: goal(tag),
    birthDateCt: `v1:${tag}-birth`,
  };
}

async function sealedUser() {
  const signedIn = await createSignedInUser();
  await db.transaction((tx) => vaultRepo.create(tx, signedIn.userId, VAULT));
  return signedIn;
}

const signInAs = (cookie: string) => {
  request.headers = new Headers({ cookie });
};

const rows = async (userId: string) => ({
  transactions: (await db.select({ n: count() }).from(transaction).where(eq(transaction.userId, userId)))[0].n,
  categories: (await db.select({ n: count() }).from(category).where(eq(category.userId, userId)))[0].n,
  subcategories: (await db.select({ n: count() }).from(subcategory).where(eq(subcategory.userId, userId)))[0].n,
  goals: (await db.select({ n: count() }).from(financialGoal).where(eq(financialGoal.userId, userId)))[0].n,
});

const NOTHING = { transactions: 0, categories: 0, subcategories: 0, goals: 0 };

beforeEach(() => {
  request.headers = new Headers();
  vi.mocked(revalidatePath).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("importDataAction", () => {
  it("answers UNAUTHORIZED without a session and touches no row (IMPORT-19)", async () => {
    const spy = vi.spyOn(importRepo, "importSealed");

    expect(await importDataAction(payload("a"))).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(spy).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers UNAUTHORIZED when the session user is no longer approved", async () => {
    const ana = await createSignedInUser(undefined, "revoked");
    signInAs(ana.cookie);

    expect(await importDataAction(payload("a"))).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(await rows(ana.userId)).toEqual(NOTHING);
  });

  it("imports into the account of the session and returns the counts (IMPORT-04, IMPORT-19)", async () => {
    const ana = await sealedUser();
    const bia = await sealedUser();
    signInAs(ana.cookie);

    expect(await importDataAction(payload("a"))).toEqual({ ok: true, transactions: 2, categories: 1 });

    expect(await rows(ana.userId)).toEqual({ transactions: 2, categories: 1, subcategories: 1, goals: 1 });
    expect(await rows(bia.userId)).toEqual(NOTHING);
    expect(await vaultRepo.getBirthDateSealed(ana.userId)).toBe("v1:a-birth");
  });

  it("revalidates the month views only on success", async () => {
    const ana = await sealedUser();
    signInAs(ana.cookie);

    await importDataAction(payload("a"));
    expect(revalidatePath).toHaveBeenCalledWith("/");

    vi.mocked(revalidatePath).mockClear();
    await importDataAction(payload("b"));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers SAVE_FAILED for a structurally invalid payload and writes nothing", async () => {
    const ana = await sealedUser();
    signInAs(ana.cookie);
    const bad = payload("a");
    bad.transactions[0].amountCt = "15000";

    expect(await importDataAction(bad)).toEqual({ ok: false, error: SAVE_FAILED });
    expect(await importDataAction(null as unknown as ImportPayload)).toEqual({ ok: false, error: SAVE_FAILED });
    expect(await rows(ana.userId)).toEqual(NOTHING);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an account that already has data with the exact message and keeps it unchanged (IMPORT-15)", async () => {
    const ana = await sealedUser();
    signInAs(ana.cookie);
    await importDataAction(payload("a"));

    expect(await importDataAction(payload("b"))).toEqual({ ok: false, error: NOT_EMPTY });
    expect(await rows(ana.userId)).toEqual({ transactions: 2, categories: 1, subcategories: 1, goals: 1 });
  });

  it("two simultaneous imports: one succeeds, the other gets the not-empty message (IMPORT-17)", async () => {
    const ana = await sealedUser();
    signInAs(ana.cookie);

    const results = await Promise.all([importDataAction(payload("a")), importDataAction(payload("b"))]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: NOT_EMPTY }]);
    expect(await rows(ana.userId)).toEqual({ transactions: 2, categories: 1, subcategories: 1, goals: 1 });
  });

  it("answers SAVE_FAILED and writes nothing when the database fails mid-import (IMPORT-14)", async () => {
    const ana = await sealedUser();
    const bia = await sealedUser();
    signInAs(bia.cookie);
    const taken = payload("b");
    await importDataAction(taken);
    // Ana's transaction reuses an id of Bia's: the primary key fails after her categories were inserted.
    signInAs(ana.cookie);
    const clash = payload("a");
    clash.transactions[1].id = taken.transactions[1].id;
    vi.mocked(revalidatePath).mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await importDataAction(clash)).toEqual({ ok: false, error: SAVE_FAILED });

    expect(await rows(ana.userId)).toEqual(NOTHING);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("importDataAction", expect.any(String));
  });
});
