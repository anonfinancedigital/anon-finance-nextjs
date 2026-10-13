import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { UserStatus } from "@/lib/domain/user-status";
import type { VaultMaterial } from "@/lib/vault/types";
import { monthRange } from "@/lib/domain/month";
import { createSignedInUser, insertCredentialUser, signInCookie } from "@/test/auth";
import { insertCategory, setupTestDb } from "@/test/db";
import { account, session, user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, loginAttempt, subcategory, transaction } from "../schema";
import { categoriesRepo } from "./categories";
import { goalsRepo } from "./goals";
import { loginAttemptsRepo } from "./login-attempts";
import { transactionsRepo } from "./transactions";
import { usersRepo } from "./users";

setupTestDb();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const PASSWORD = "senha-da-ana-123";
const ana = { name: "Ana", email: "ana@x.com", password: PASSWORD };

const VAULT: VaultMaterial = {
  kdfVersion: 1,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 65536,
  iterations: 3,
  parallelism: 1,
  dekWrappedPw: "v1:pw-wrapped",
  dekWrappedRecovery: "v1:recovery-wrapped",
};

/** Sealed signup of `ana`, the auth secret standing in for the password. */
const signupAna = () =>
  usersRepo.createSealed({
    id: randomUUID(),
    name: ana.name,
    email: ana.email,
    authSecret: ana.password,
    vault: VAULT,
    ipHash: null,
  });

const userRow = async (id: string) => (await db.select().from(user).where(eq(user.id, id)))[0];

/** Inserts a credential-less user with the given status and creation instant. */
async function insertUser(status: UserStatus, createdAt: Date, email = `${randomUUID()}@example.com`) {
  const id = randomUUID();
  await db.insert(user).values({ id, name: `Nome ${email}`, email, status, createdAt });
  return id;
}

describe("usersRepo.findByEmail", () => {
  it("returns id, e-mail, status and password hash, ignoring case and spaces", async () => {
    await signupAna();
    const [row] = await db.select().from(user);

    const found = await usersRepo.findByEmail(" ANA@x.com ");

    expect(found).toMatchObject({ id: row.id, email: "ana@x.com", status: "approved" });
    expect(await verifyPassword({ hash: found!.passwordHash!, password: PASSWORD })).toBe(true);
  });

  it("returns null for an unknown e-mail", async () => {
    expect(await usersRepo.findByEmail("ninguem@x.com")).toBeNull();
  });
});

describe("usersRepo.findById", () => {
  it("returns id, e-mail and status", async () => {
    const id = await insertCredentialUser("ana@x.com", PASSWORD, "revoked");
    expect(await usersRepo.findById(id)).toEqual({ id, email: "ana@x.com", status: "revoked" });
  });

  it("returns null for an unknown id", async () => {
    expect(await usersRepo.findById(randomUUID())).toBeNull();
  });
});

describe("usersRepo.listForAdmin", () => {
  it("excludes the admin and lists pending first, each group oldest first", async () => {
    const t = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 12, minutes));
    await insertUser("approved", t(0), ADMIN_EMAIL);
    const approvedOld = await insertUser("approved", t(1));
    const pendingNew = await insertUser("pending", t(9));
    const rejected = await insertUser("rejected", t(3));
    const pendingOld = await insertUser("pending", t(2));
    const revoked = await insertUser("revoked", t(5));

    const rows = await usersRepo.listForAdmin(` ${ADMIN_EMAIL.toUpperCase()} `);

    expect(rows.map((r) => r.id)).toEqual([pendingOld, pendingNew, approvedOld, rejected, revoked]);
    const first = await userRow(pendingOld);
    expect(rows[0]).toEqual({
      id: pendingOld,
      name: first.name,
      email: first.email,
      status: "pending",
      createdAt: t(2),
    });
  });

  it("returns an empty list when only the admin exists", async () => {
    await insertUser("approved", new Date(), ADMIN_EMAIL);
    expect(await usersRepo.listForAdmin(ADMIN_EMAIL)).toEqual([]);
  });
});

describe("usersRepo.transition", () => {
  const cases: [UserStatus, "reactivate" | "revoke", UserStatus][] = [
    ["revoked", "reactivate", "approved"],
    ["approved", "revoke", "revoked"],
  ];

  it.each(cases)("moves %s through %s to %s and records decided_at", async (from, action, to) => {
    const before = new Date(Date.now() - 1000);
    const id = await insertUser(from, new Date());

    expect(await usersRepo.transition(id, action)).toBe("ok");

    const row = await userRow(id);
    expect(row.status).toBe(to);
    expect(row.decidedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  const invalid: [UserStatus, "reactivate" | "revoke"][] = [
    ["pending", "reactivate"],
    ["rejected", "reactivate"],
    ["pending", "revoke"],
    ["rejected", "revoke"],
    ["revoked", "revoke"],
  ];

  it.each(invalid)("returns wrong_state for %s through %s, keeping the row", async (from, action) => {
    const id = await insertUser(from, new Date());
    const before = await userRow(id);

    expect(await usersRepo.transition(id, action)).toBe("wrong_state");
    expect(await userRow(id)).toEqual(before);
  });

  it("returns ok when reactivating an approved user, keeping decided_at", async () => {
    const id = await insertUser("approved", new Date());
    const decidedAt = new Date(Date.UTC(2026, 0, 1));
    await db.update(user).set({ decidedAt }).where(eq(user.id, id));

    expect(await usersRepo.transition(id, "reactivate")).toBe("ok");

    const row = await userRow(id);
    expect(row.status).toBe("approved");
    expect(row.decidedAt).toEqual(decidedAt);
  });

  it.each([["reactivate"], ["revoke"]] as const)(
    "returns not_found for an unknown id on %s",
    async (action) => {
      await insertUser("pending", new Date());
      expect(await usersRepo.transition(randomUUID(), action)).toBe("not_found");
    },
  );

  it("returns not_found for the admin and leaves the admin unchanged", async () => {
    const id = await insertUser("approved", new Date(), ADMIN_EMAIL);
    const before = await userRow(id);

    expect(await usersRepo.transition(id, "revoke")).toBe("not_found");
    expect(await userRow(id)).toEqual(before);
  });
});

/** Runs `fn` while every DELETE on `table` raises, dropping the trigger afterwards. */
async function withFailingDelete<T>(table: string, fn: () => Promise<T>): Promise<T> {
  await db.execute(
    sql.raw(`CREATE FUNCTION fail_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected delete failure'; END $$`),
  );
  await db.execute(
    sql.raw(`CREATE TRIGGER fail_delete BEFORE DELETE ON "${table}"
      FOR EACH STATEMENT EXECUTE FUNCTION fail_delete()`),
  );
  try {
    return await fn();
  } finally {
    await db.execute(sql.raw(`DROP TRIGGER fail_delete ON "${table}"`));
    await db.execute(sql.raw("DROP FUNCTION fail_delete()"));
  }
}

describe("usersRepo.transition with revokeSessions", () => {
  it.each([["approved", "revoke", "revoked"]] as const)(
    "moves %s through %s to %s, stamps decided_at and ends only that user's sessions",
    async (status, action, to) => {
      const before = new Date(Date.now() - 1000);
      const target = await createSignedInUser(undefined, status);
      const other = await createSignedInUser();

      expect(await usersRepo.transition(target.userId, action, { revokeSessions: true })).toBe("ok");

      const row = await userRow(target.userId);
      expect(row.status).toBe(to);
      expect(row.decidedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(await db.$count(session, eq(session.userId, target.userId))).toBe(0);
      expect(await db.$count(session, eq(session.userId, other.userId))).toBe(1);
    },
  );

  it.each([["approved", "revoke"]] as const)(
    "keeps the %s status, decided_at and sessions when ending the sessions fails on %s",
    async (status, action) => {
      const target = await createSignedInUser(undefined, status);
      const before = await userRow(target.userId);

      await withFailingDelete("session", () =>
        expect(usersRepo.transition(target.userId, action, { revokeSessions: true })).rejects.toThrow(),
      );

      expect(await userRow(target.userId)).toEqual(before);
      expect(await db.$count(session, eq(session.userId, target.userId))).toBe(1);
    },
  );

  it("keeps the sessions without the option", async () => {
    const target = await createSignedInUser(undefined, "revoked");

    expect(await usersRepo.transition(target.userId, "reactivate")).toBe("ok");

    expect((await userRow(target.userId)).status).toBe("approved");
    expect(await db.$count(session, eq(session.userId, target.userId))).toBe(1);
  });
});

describe("usersRepo.revokeSessions", () => {
  it("deletes only the sessions of that user", async () => {
    const target = await createSignedInUser();
    await signInCookie(target.email);
    const other = await createSignedInUser();

    expect(await db.$count(session, eq(session.userId, target.userId))).toBe(2);

    await usersRepo.revokeSessions(target.userId);

    expect(await db.$count(session, eq(session.userId, target.userId))).toBe(0);
    expect(await db.$count(session, eq(session.userId, other.userId))).toBe(1);
  });
});

/** A user with categories (with percent versions and a subcategory), an expense and a goal. */
async function userWithData(email: string) {
  const userId = await insertCredentialUser(email);
  const cat = await insertCategory(userId, { name: "Conforto", percentMicro: 100000000, color: 1 });
  const [sub] = await db
    .insert(subcategory)
    .values({ userId, categoryId: cat.id, name: "Restaurante" })
    .returning();
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "expense",
    amountCents: 1000,
    date: "2026-10-04",
    categoryId: cat.id,
    subcategoryId: sub.id,
  });
  await goalsRepo.upsertSealed(userId, {
    monthlyIncomeCt: "v1:renda",
    savedCt: "v1:guardado",
    retirementAgeCt: "v1:idade",
    annualRateCt: "v1:retorno",
    withdrawalRateCt: "v1:retirada",
  });
  return { userId, categoryId: cat.id };
}

describe("usersRepo.remove", () => {
  it("deletes the user, sessions, accounts, all their data and login attempts, keeping another user's", async () => {
    const target = await userWithData("ana@x.com");
    const other = await userWithData("bia@x.com");
    await db.insert(session).values({
      id: randomUUID(),
      token: randomUUID(),
      userId: target.userId,
      expiresAt: new Date(Date.now() + 60_000),
      updatedAt: new Date(),
    });
    await loginAttemptsRepo.recordFailure("ana@x.com");
    await loginAttemptsRepo.recordFailure("bia@x.com");

    expect(await usersRepo.remove(target.userId)).toBe("ok");

    const owned = async (userId: string, categoryId: string) => [
      await db.$count(user, eq(user.id, userId)),
      await db.$count(account, eq(account.userId, userId)),
      await db.$count(category, eq(category.userId, userId)),
      await db.$count(categoryPercent, eq(categoryPercent.categoryId, categoryId)),
      await db.$count(subcategory, eq(subcategory.userId, userId)),
      await db.$count(transaction, eq(transaction.userId, userId)),
      await db.$count(financialGoal, eq(financialGoal.userId, userId)),
    ];
    expect(await owned(target.userId, target.categoryId)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(await db.$count(session, eq(session.userId, target.userId))).toBe(0);
    expect(await db.$count(loginAttempt, eq(loginAttempt.email, "ana@x.com"))).toBe(0);

    expect(await owned(other.userId, other.categoryId)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(await db.$count(loginAttempt, eq(loginAttempt.email, "bia@x.com"))).toBe(1);
  });

  it("frees the e-mail for a new signup", async () => {
    const { userId } = await userWithData("ana@x.com");
    await usersRepo.remove(userId);
    expect(await signupAna()).toEqual({ ok: true });
  });

  it("deletes nothing when a write inside the deletion fails", async () => {
    const { userId, categoryId } = await userWithData("ana@x.com");
    await signInCookie("ana@x.com");
    await loginAttemptsRepo.recordFailure("ana@x.com");

    await withFailingDelete("login_attempt", () => expect(usersRepo.remove(userId)).rejects.toThrow());

    expect([
      await db.$count(user, eq(user.id, userId)),
      await db.$count(session, eq(session.userId, userId)),
      await db.$count(account, eq(account.userId, userId)),
      await db.$count(category, eq(category.userId, userId)),
      await db.$count(categoryPercent, eq(categoryPercent.categoryId, categoryId)),
      await db.$count(subcategory, eq(subcategory.userId, userId)),
      await db.$count(transaction, eq(transaction.userId, userId)),
      await db.$count(financialGoal, eq(financialGoal.userId, userId)),
      await db.$count(loginAttempt, eq(loginAttempt.email, "ana@x.com")),
    ]).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("returns not_found for an unknown id, deleting nothing", async () => {
    await userWithData("ana@x.com");
    expect(await usersRepo.remove(randomUUID())).toBe("not_found");
    expect(await db.$count(user)).toBe(1);
  });
});

describe("isolation of a new approved user (SIGNUP-07)", () => {
  it("sees no categories, transactions or goal while another user has data", async () => {
    await userWithData("admin-data@x.com");
    await signupAna();
    const found = await usersRepo.findByEmail(ana.email);
    await db.update(user).set({ status: "revoked" }).where(eq(user.id, found!.id));
    expect(await usersRepo.transition(found!.id, "reactivate")).toBe("ok");

    expect(await categoriesRepo.listForMonthSealed(found!.id, { year: 2026, month: 10 }, new Date("2026-10-15T12:00:00Z"))).toEqual([]);
    expect(await transactionsRepo.listByMonthSealed(found!.id, monthRange({ year: 2026, month: 10 }))).toEqual(
      [],
    );
    expect(await goalsRepo.getSealed(found!.id)).toBeNull();
  });
});
