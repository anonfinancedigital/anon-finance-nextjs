import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_FAILED } from "@/lib/action-result";
import { db } from "@/lib/db/client";
import { exportRowsSealed } from "@/lib/db/repos/export";
import { vaultRepo } from "@/lib/db/repos/vault";
import { category, categoryPercent, financialGoal, subcategory, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { exportDataAction } from "./account";

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
