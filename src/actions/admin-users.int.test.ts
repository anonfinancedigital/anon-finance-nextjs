import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { goalsRepo } from "@/lib/db/repos/goals";
import { usersRepo } from "@/lib/db/repos/users";
import { category, categoryPercent, financialGoal, transaction } from "@/lib/db/schema";
import type { UserStatus } from "@/lib/domain/user-status";
import { createSignedInUser, signInCookie } from "@/test/auth";
import { insertCategory, setupTestDb } from "@/test/db";
import { deleteUser, reactivateUser, revokeUser } from "./admin-users";
import { signUpSealedAction } from "./auth";
import { saveGoalSealed } from "./goals-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/push/security", () => ({ notifySecurity: vi.fn(async () => {}) }));

const { revalidatePath } = await import("next/cache");
const { notifySecurity } = await import("@/lib/push/security");

setupTestDb();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const NOT_FOUND = { ok: false, error: "Cadastro não encontrado" };
const UNAUTHORIZED = { ok: false, error: "UNAUTHORIZED" };
const SAVE_FAILED = { ok: false, error: "Não foi possível salvar. Tente novamente" };
const DECIDED_AT = new Date("2026-01-02T03:04:05Z");
const GOAL_DTO = {
  monthlyIncomeCt: "v1:renda",
  savedCt: "v1:guardado",
  retirementAgeCt: "v1:idade",
  annualRateCt: "v1:retorno",
  withdrawalRateCt: "v1:retirada",
};

/** A database error carrying a Postgres code and a message that must not reach the log. */
const dbFailure = () => Object.assign(new Error("connection refused"), { code: "08006" });

const userRow = async (id: string) => (await db.select().from(user).where(eq(user.id, id)))[0];
const sessionsOf = (id: string) => db.$count(session, eq(session.userId, id));

/** A user with an open session (taken while approved), then moved to the status, with a known decided_at. */
async function target(status: UserStatus) {
  const signedIn = await createSignedInUser(undefined, status);
  await db.update(user).set({ decidedAt: DECIDED_AT }).where(eq(user.id, signedIn.userId));
  return signedIn;
}

let adminId: string;

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(notifySecurity).mockReset();
  vi.mocked(notifySecurity).mockResolvedValue(undefined);
  const admin = await createSignedInUser(ADMIN_EMAIL);
  adminId = admin.userId;
  request.headers = new Headers({ cookie: admin.cookie });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reactivateUser", () => {
  it("reactivates a revoked user, stamps decided_at and lets the user sign in", async () => {
    const { userId, email } = await target("revoked");

    expect(await reactivateUser(userId)).toEqual({ ok: true });

    const row = await userRow(userId);
    expect(row.status).toBe("approved");
    expect(row.decidedAt).not.toEqual(DECIDED_AT);
    expect(row.decidedAt).toBeInstanceOf(Date);
    await expect(signInCookie(email)).resolves.toMatch(/=/);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");
  });

  it("keeps an approved user and its decided_at, without an error", async () => {
    const { userId } = await target("approved");

    expect(await reactivateUser(userId)).toEqual({ ok: true });

    expect(await userRow(userId)).toMatchObject({ status: "approved", decidedAt: DECIDED_AT });
  });

  it.each([["pending"], ["rejected"]] as const)(
    "keeps a %s user and answers that the user is not revoked",
    async (status) => {
      const { userId } = await target(status);

      expect(await reactivateUser(userId)).toEqual({ ok: false, error: "Este usuário não está revogado" });

      expect(await userRow(userId)).toMatchObject({ status, decidedAt: DECIDED_AT });
      expect(await sessionsOf(userId)).toBe(1);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("returns not found for an unknown id and for the admin", async () => {
    expect(await reactivateUser(randomUUID())).toEqual(NOT_FOUND);
    expect(await reactivateUser(adminId)).toEqual(NOT_FOUND);

    expect(await userRow(adminId)).toMatchObject({ status: "approved" });
    expect(await sessionsOf(adminId)).toBe(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the save error on a database failure and keeps the status", async () => {
    const { userId } = await target("revoked");
    vi.spyOn(usersRepo, "transition").mockRejectedValueOnce(dbFailure());
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await reactivateUser(userId)).toEqual(SAVE_FAILED);

    expect(log.mock.calls).toEqual([["reactivateUser", "08006"]]);

    expect(await userRow(userId)).toMatchObject({ status: "revoked", decidedAt: DECIDED_AT });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const ADMIN_TARGET = { ok: false, error: "Não é possível revogar ou excluir o administrador" };

/** A category, an expense in it and a goal of the user; returns the category id. */
async function addData(userId: string) {
  const cat = await insertCategory(userId, { name: "Conforto", percentMicro: 100000000, color: 1 });
  await db.insert(transaction).values({
    id: randomUUID(),
    userId,
    kind: "expense",
    amountCents: 1000,
    date: "2026-10-04",
    categoryId: cat.id,
  });
  await goalsRepo.upsertSealed(userId, {
    monthlyIncomeCt: "v1:renda",
    savedCt: "v1:guardado",
    retirementAgeCt: "v1:idade",
    annualRateCt: "v1:retorno",
    withdrawalRateCt: "v1:retirada",
  });
  return cat.id;
}

const dataCounts = async (userId: string) => [
  await db.$count(category, eq(category.userId, userId)),
  await db.$count(transaction, eq(transaction.userId, userId)),
  await db.$count(financialGoal, eq(financialGoal.userId, userId)),
];

describe("revokeUser", () => {
  it("revokes an approved user, stamps decided_at, ends its sessions and keeps its data", async () => {
    const { userId } = await target("approved");
    await addData(userId);

    expect(await revokeUser(userId)).toEqual({ ok: true });

    const row = await userRow(userId);
    expect(row.status).toBe("revoked");
    expect(row.decidedAt).not.toEqual(DECIDED_AT);
    expect(row.decidedAt).toBeInstanceOf(Date);
    expect(await sessionsOf(userId)).toBe(0);
    expect(await sessionsOf(adminId)).toBe(1);
    expect(await dataCounts(userId)).toEqual([1, 1, 1]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");
  });

  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "keeps a %s user and answers that the user is not approved",
    async (status) => {
      const { userId } = await target(status);

      expect(await revokeUser(userId)).toEqual({ ok: false, error: "Este usuário não está aprovado" });

      expect(await userRow(userId)).toMatchObject({ status, decidedAt: DECIDED_AT });
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("refuses to revoke the admin", async () => {
    expect(await revokeUser(adminId)).toEqual(ADMIN_TARGET);

    expect(await userRow(adminId)).toMatchObject({ status: "approved" });
    expect(await sessionsOf(adminId)).toBe(1);
  });

  it("leaves a revoked user with an open session unauthorized on the next protected action", async () => {
    const { userId, cookie } = await target("approved");
    expect(await revokeUser(userId)).toEqual({ ok: true });

    request.headers = new Headers({ cookie });
    expect(await saveGoalSealed(GOAL_DTO)).toEqual(UNAUTHORIZED);
    expect(await db.$count(financialGoal, eq(financialGoal.userId, userId))).toBe(0);
  });
});

describe("deleteUser", () => {
  it.each([["pending"], ["approved"], ["rejected"], ["revoked"]] as const)(
    "deletes a %s user with all its data, keeps another user's and frees the e-mail",
    async (status) => {
      const { userId, email } = await target(status);
      const categoryId = await addData(userId);
      const other = await createSignedInUser();
      await addData(other.userId);

      expect(await deleteUser(userId)).toEqual({ ok: true });

      expect(await userRow(userId)).toBeUndefined();
      expect(await sessionsOf(userId)).toBe(0);
      expect(await db.$count(account, eq(account.userId, userId))).toBe(0);
      expect(await db.$count(categoryPercent, eq(categoryPercent.categoryId, categoryId))).toBe(0);
      expect(await dataCounts(userId)).toEqual([0, 0, 0]);
      expect(await dataCounts(other.userId)).toEqual([1, 1, 1]);
      expect(await userRow(other.userId)).toBeDefined();
      expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");

      expect(
        await signUpSealedAction({
          userId: randomUUID(),
          name: "De novo",
          email,
          authSecret: "A".repeat(43),
          vault: {
            kdfVersion: 1,
            salt: "AAAAAAAAAAAAAAAAAAAAAA",
            memKib: 65536,
            iterations: 3,
            parallelism: 1,
            dekWrappedPw: "v1:pw",
            dekWrappedRecovery: "v1:recovery",
          },
          birthDateCt: "v1:birth",
        }),
      ).toEqual({ ok: true });
    },
  );

  it("returns not found for an unknown id", async () => {
    expect(await deleteUser(randomUUID())).toEqual(NOT_FOUND);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses to delete the admin", async () => {
    await addData(adminId);

    expect(await deleteUser(adminId)).toEqual(ADMIN_TARGET);

    expect(await userRow(adminId)).toMatchObject({ status: "approved" });
    expect(await dataCounts(adminId)).toEqual([1, 1, 1]);
  });

  it("returns the save error on a database failure and deletes nothing", async () => {
    const { userId } = await target("approved");
    await addData(userId);
    vi.spyOn(usersRepo, "remove").mockRejectedValueOnce(dbFailure());
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteUser(userId)).toEqual(SAVE_FAILED);

    expect(log.mock.calls).toEqual([["deleteUser", "08006"]]);

    expect(await userRow(userId)).toBeDefined();
    expect(await dataCounts(userId)).toEqual([1, 1, 1]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

/** Runs `fn` while every DELETE on `session` raises, dropping the trigger afterwards. */
async function withFailingSessionDelete<T>(fn: () => Promise<T>): Promise<T> {
  await db.execute(
    sql.raw(`CREATE FUNCTION fail_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected delete failure'; END $$`),
  );
  await db.execute(
    sql.raw(`CREATE TRIGGER fail_delete BEFORE DELETE ON "session"
      FOR EACH STATEMENT EXECUTE FUNCTION fail_delete()`),
  );
  try {
    return await fn();
  } finally {
    await db.execute(sql.raw(`DROP TRIGGER fail_delete ON "session"`));
    await db.execute(sql.raw("DROP FUNCTION fail_delete()"));
  }
}

describe("revoke when ending the sessions fails", () => {
  it.each([["revokeUser", "approved", revokeUser]] as const)("%s returns the save error and keeps the %s status", async (name, status, decide) => {
    const { userId } = await target(status);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await withFailingSessionDelete(() => decide(userId))).toEqual(SAVE_FAILED);

    // Only the action name and a string code: the error object never reaches the log (SIGILO-26).
    expect(log.mock.calls).toEqual([[name, expect.any(String)]]);

    expect(await userRow(userId)).toMatchObject({ status, decidedAt: DECIDED_AT });
    expect(await sessionsOf(userId)).toBe(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("revoke and delete without admin rights", () => {
  it("return UNAUTHORIZED to an approved user who is not the admin, changing nothing", async () => {
    const { userId } = await target("approved");
    await addData(userId);
    const other = await createSignedInUser();
    request.headers = new Headers({ cookie: other.cookie });

    expect(await revokeUser(userId)).toEqual(UNAUTHORIZED);
    expect(await deleteUser(userId)).toEqual(UNAUTHORIZED);

    expect(await userRow(userId)).toMatchObject({ status: "approved", decidedAt: DECIDED_AT });
    expect(await sessionsOf(userId)).toBe(1);
    expect(await dataCounts(userId)).toEqual([1, 1, 1]);
  });
});

describe("reactivate without admin rights", () => {
  it("returns UNAUTHORIZED to an approved user who is not the admin, changing nothing", async () => {
    const { userId } = await target("revoked");
    const other = await createSignedInUser();
    request.headers = new Headers({ cookie: other.cookie });

    expect(await reactivateUser(userId)).toEqual(UNAUTHORIZED);

    expect(await userRow(userId)).toMatchObject({ status: "revoked", decidedAt: DECIDED_AT });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNAUTHORIZED without a session, changing nothing", async () => {
    const { userId } = await target("revoked");
    request.headers = new Headers();

    expect(await reactivateUser(userId)).toEqual(UNAUTHORIZED);

    expect(await userRow(userId)).toMatchObject({ status: "revoked", decidedAt: DECIDED_AT });
  });
});

describe("security notice on revoke (PUSH-34, PUSH-35)", () => {
  it("revoking notifies the revoked user once", async () => {
    const { userId } = await target("approved");

    expect(await revokeUser(userId)).toEqual({ ok: true });

    expect(vi.mocked(notifySecurity).mock.calls).toEqual([[userId, "revoked"]]);
  });

  it("reactivating, deleting and a refused revoke do not notify", async () => {
    const revoked = await target("revoked");
    const approved = await target("approved");
    const pending = await target("pending");

    expect(await reactivateUser(revoked.userId)).toEqual({ ok: true });
    expect(await deleteUser(approved.userId)).toEqual({ ok: true });
    expect(await revokeUser(pending.userId)).toEqual({ ok: false, error: "Este usuário não está aprovado" });

    expect(notifySecurity).not.toHaveBeenCalled();
  });

  it("a failing notice keeps the ok and the revocation", async () => {
    const { userId } = await target("approved");
    vi.mocked(notifySecurity).mockRejectedValueOnce(new Error("push service down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await revokeUser(userId)).toEqual({ ok: true });

    expect(await userRow(userId)).toMatchObject({ status: "revoked" });
    expect(await sessionsOf(userId)).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");
  });
});
