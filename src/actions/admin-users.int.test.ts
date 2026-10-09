import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { account, session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { goalsRepo } from "@/lib/db/repos/goals";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { usersRepo } from "@/lib/db/repos/users";
import { category, categoryPercent, financialGoal, transaction } from "@/lib/db/schema";
import type { UserStatus } from "@/lib/domain/user-status";
import { createSignedInUser, insertCredentialUser, signInCookie } from "@/test/auth";
import { insertCategory, setupTestDb } from "@/test/db";
import { approveUser, deleteUser, rejectUser, revokeUser } from "./admin-users";
import { signUpAction } from "./auth";
import { saveGoalSealed } from "./goals-sealed";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

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
  const admin = await createSignedInUser(ADMIN_EMAIL);
  adminId = admin.userId;
  request.headers = new Headers({ cookie: admin.cookie });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("approveUser", () => {
  it.each([["pending"], ["rejected"], ["revoked"]] as const)(
    "approves a %s user, stamps decided_at and lets the user sign in",
    async (status) => {
      const { userId, email } = await target(status);

      expect(await approveUser(userId)).toEqual({ ok: true });

      const row = await userRow(userId);
      expect(row.status).toBe("approved");
      expect(row.decidedAt).not.toEqual(DECIDED_AT);
      expect(row.decidedAt).toBeInstanceOf(Date);
      await expect(signInCookie(email)).resolves.toMatch(/=/);
      expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");
    },
  );

  it("keeps an approved user and its decided_at, without an error", async () => {
    const { userId } = await target("approved");

    expect(await approveUser(userId)).toEqual({ ok: true });

    expect(await userRow(userId)).toMatchObject({ status: "approved", decidedAt: DECIDED_AT });
  });

  it("returns not found for an unknown id and for the admin", async () => {
    expect(await approveUser(randomUUID())).toEqual(NOT_FOUND);
    expect(await approveUser(adminId)).toEqual(NOT_FOUND);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the save error on a database failure and keeps the status", async () => {
    const { userId } = await target("pending");
    vi.spyOn(usersRepo, "transition").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await approveUser(userId)).toEqual(SAVE_FAILED);

    expect(await userRow(userId)).toMatchObject({ status: "pending", decidedAt: DECIDED_AT });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("rejectUser", () => {
  it("rejects a pending user, stamps decided_at and ends only that user's sessions", async () => {
    const { userId } = await target("pending");
    expect(await sessionsOf(userId)).toBe(1);

    expect(await rejectUser(userId)).toEqual({ ok: true });

    const row = await userRow(userId);
    expect(row.status).toBe("rejected");
    expect(row.decidedAt).not.toEqual(DECIDED_AT);
    expect(row.decidedAt).toBeInstanceOf(Date);
    expect(await sessionsOf(userId)).toBe(0);
    expect(await sessionsOf(adminId)).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cadastros");
  });

  it.each([["approved"], ["rejected"], ["revoked"]] as const)(
    "keeps a %s user and answers that the signup is not pending",
    async (status) => {
      const { userId } = await target(status);

      expect(await rejectUser(userId)).toEqual({ ok: false, error: "Este cadastro não está pendente" });

      expect(await userRow(userId)).toMatchObject({ status, decidedAt: DECIDED_AT });
      expect(await sessionsOf(userId)).toBe(1);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("returns not found for an unknown id and for the admin", async () => {
    expect(await rejectUser(randomUUID())).toEqual(NOT_FOUND);
    expect(await rejectUser(adminId)).toEqual(NOT_FOUND);

    expect(await userRow(adminId)).toMatchObject({ status: "approved" });
    expect(await sessionsOf(adminId)).toBe(1);
  });

  it("returns the save error on a database failure and keeps the status", async () => {
    const { userId } = await target("pending");
    vi.spyOn(usersRepo, "transition").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await rejectUser(userId)).toEqual(SAVE_FAILED);

    expect(await userRow(userId)).toMatchObject({ status: "pending", decidedAt: DECIDED_AT });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const ADMIN_TARGET = { ok: false, error: "Não é possível revogar ou excluir o administrador" };

/** A category, an expense in it and a goal of the user; returns the category id. */
async function addData(userId: string) {
  const cat = await insertCategory(userId, { name: "Conforto", percentMicro: 100000000, color: 1 });
  await transactionsRepo.create(userId, {
    id: randomUUID(),
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

      const signup = new FormData();
      signup.set("name", "De novo");
      signup.set("email", email);
      signup.set("birthDate", "18/09/1993");
      signup.set("password", "12345678");
      signup.set("confirmPassword", "12345678");
      expect(await signUpAction(undefined, signup)).toEqual({ ok: true });
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
    vi.spyOn(usersRepo, "remove").mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteUser(userId)).toEqual(SAVE_FAILED);

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

describe("reject and revoke when ending the sessions fails", () => {
  it.each([
    ["rejectUser", "pending", rejectUser],
    ["revokeUser", "approved", revokeUser],
  ] as const)("%s returns the save error and keeps the %s status", async (_, status, decide) => {
    const { userId } = await target(status);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await withFailingSessionDelete(() => decide(userId))).toEqual(SAVE_FAILED);

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

describe("approve and reject without admin rights", () => {
  it("return UNAUTHORIZED to an approved user who is not the admin, changing nothing", async () => {
    const pendingId = await insertCredentialUser("ana@x.com", undefined, "pending");
    const other = await createSignedInUser();
    request.headers = new Headers({ cookie: other.cookie });

    expect(await approveUser(pendingId)).toEqual(UNAUTHORIZED);
    expect(await rejectUser(pendingId)).toEqual(UNAUTHORIZED);

    expect(await userRow(pendingId)).toMatchObject({ status: "pending", decidedAt: null });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("return UNAUTHORIZED without a session, changing nothing", async () => {
    const pendingId = await insertCredentialUser("ana@x.com", undefined, "pending");
    request.headers = new Headers();

    expect(await approveUser(pendingId)).toEqual(UNAUTHORIZED);
    expect(await rejectUser(pendingId)).toEqual(UNAUTHORIZED);

    expect(await userRow(pendingId)).toMatchObject({ status: "pending", decidedAt: null });
  });
});
