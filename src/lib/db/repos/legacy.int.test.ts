import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { VaultMaterial } from "@/lib/vault/types";
import { insertCredentialUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { insertLegacyAccount } from "@/test/legacy";
import { account } from "../auth-schema";
import { db } from "../client";
import { category, transaction } from "../schema";
import { legacyRepo } from "./legacy";
import { vaultRepo } from "./vault";

setupTestDb();

const VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw",
  dekWrappedRecovery: "v1:rec",
};

const legacyAccount = insertLegacyAccount;

describe("legacyRepo.isLegacy", () => {
  it("is true without a vault row and false with one", async () => {
    const userId = await insertCredentialUser("a@x.com");
    expect(await legacyRepo.isLegacy(userId)).toBe(true);
    await db.transaction((tx) => vaultRepo.create(tx, userId, VAULT));
    expect(await legacyRepo.isLegacy(userId)).toBe(false);
  });

  it("is false for an unknown user", async () => {
    expect(await legacyRepo.isLegacy(randomUUID())).toBe(false);
  });

  const linkGoogle = (userId: string) =>
    db.insert(account).values({ id: randomUUID(), userId, accountId: randomUUID(), providerId: "google" });

  it("is false without a vault when the only account is Google (a new Google account)", async () => {
    const userId = await insertTestUser();
    await linkGoogle(userId);
    expect(await legacyRepo.isLegacy(userId)).toBe(false);
  });

  it("is false without a vault and without any account", async () => {
    expect(await legacyRepo.isLegacy(await insertTestUser())).toBe(false);
  });

  it("stays true for a password account without a vault that also linked Google", async () => {
    const userId = await insertCredentialUser("a@x.com");
    await linkGoogle(userId);
    expect(await legacyRepo.isLegacy(userId)).toBe(true);
  });
});

describe("legacyRepo.readPlain", () => {
  it("returns every plain-text table, including recurring rows and a deleted category", async () => {
    const { userId, cat, gone, sub } = await legacyAccount();
    await db.update(category).set({ deletedFrom: "2026-08-01" }).where(eq(category.id, gone.id));

    const res = await legacyRepo.readPlain(userId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = res.plain;
    expect(p.birthDate).toBe("1990-05-17");
    expect(p.goal).toEqual({
      monthlyIncomeCents: 1_000_000,
      savedCents: 50_000,
      retirementAge: 60,
      annualRateBp: 800,
      withdrawalRateBp: 600,
    });
    expect(p.transactions).toHaveLength(2);
    const expense = p.transactions.find((t) => t.kind === "expense")!;
    expect(expense).toMatchObject({
      amountCents: 12345,
      description: "Mercado",
      categoryId: cat.id,
      subcategoryId: sub.id,
      recurring: false,
      recurrenceDay: null,
      seriesId: null,
    });
    const series = p.transactions.find((t) => t.kind === "income")!;
    expect(series).toMatchObject({
      amountCents: 500000,
      description: null,
      recurring: true,
      recurrenceDay: 31,
      recurrenceEnd: "2026-12-01",
      seriesId: series.id,
    });
    expect(p.categories.map((c) => c.id).sort()).toEqual([cat.id, gone.id].sort());
    const deleted = p.categories.find((c) => c.id === gone.id)!;
    expect(deleted).toMatchObject({ name: "Antiga", deletedFrom: "2026-08-01", color: 4 });
    expect(deleted.versions).toEqual([{ fromMonth: "0001-01-01", percentMicro: 10_000_000 }]);
    const live = p.categories.find((c) => c.id === cat.id)!;
    expect(live).toMatchObject({ name: "Moradia", isInvestment: false, color: 2 });
    expect(live.versions).toEqual([
      { fromMonth: "0001-01-01", percentMicro: 30_000_000 },
      { fromMonth: "2026-06-01", percentMicro: 35_000_000 },
    ]);
    expect(live.subcategories).toEqual([{ id: sub.id, name: "Aluguel" }]);
  });

  it("returns not_legacy for an account with a vault", async () => {
    const { userId } = await legacyAccount();
    await db.transaction((tx) => vaultRepo.create(tx, userId, VAULT));
    expect(await legacyRepo.readPlain(userId)).toEqual({ ok: false, reason: "not_legacy" });
  });

  it("reads only the requested user's rows", async () => {
    const a = await legacyAccount("a@x.com");
    const b = await legacyAccount("b@x.com");
    const res = await legacyRepo.readPlain(a.userId);
    if (!res.ok) throw new Error("expected legacy");
    const ids = new Set(res.plain.categories.map((c) => c.id));
    expect(ids.has(b.cat.id)).toBe(false);
    expect(res.plain.categories).toHaveLength(2);
    expect(res.plain.transactions).toHaveLength(2);
    const bTx = await db.select().from(transaction).where(eq(transaction.userId, b.userId));
    for (const t of bTx) expect(res.plain.transactions.map((x) => x.id)).not.toContain(t.id);
  });

  it("returns null goal and birth date and empty lists for an account without data", async () => {
    const userId = await insertCredentialUser("vazio@x.com");
    expect(await legacyRepo.readPlain(userId)).toEqual({
      ok: true,
      plain: { transactions: [], categories: [], goal: null, birthDate: null },
    });
  });
});
