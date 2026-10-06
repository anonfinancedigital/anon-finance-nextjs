import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session, user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { usersRepo } from "@/lib/db/repos/users";
import type { UserStatus } from "@/lib/domain/user-status";
import { createSignedInUser, insertCredentialUser, signInCookie } from "@/test/auth";
import { setupTestDb } from "@/test/db";
import { approveUser, rejectUser } from "./admin-users";

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
