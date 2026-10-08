import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { fromStatuses, targetStatus, type UserAction, type UserStatus } from "@/lib/domain/user-status";
import { account, session, user } from "../auth-schema";
import { db } from "../client";
import { loginAttempt } from "../schema";

const normalize = (email: string) => email.trim().toLowerCase();

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
};

/**
 * Creates a pending user with a credential account (Better Auth salted hash) in one transaction.
 * `ON CONFLICT (email) DO NOTHING` turns an existing e-mail, or a concurrent signup, into `duplicate`.
 */
async function createPending(input: {
  name: string;
  email: string;
  password: string;
  birthDate?: string;
}): Promise<{ ok: true } | { ok: false; reason: "duplicate" }> {
  const hash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const id = randomUUID();
    const inserted = await tx
      .insert(user)
      .values({
        id,
        name: input.name,
        email: normalize(input.email),
        status: "pending",
        birthDate: input.birthDate ?? null,
      })
      .onConflictDoNothing({ target: user.email })
      .returning({ id: user.id });
    if (inserted.length === 0) return { ok: false, reason: "duplicate" } as const;
    await tx
      .insert(account)
      .values({ id: randomUUID(), userId: id, accountId: id, providerId: "credential", password: hash });
    return { ok: true } as const;
  });
}

/** The user of the e-mail (any case) with the credential password hash, or null. */
async function findByEmail(
  email: string,
): Promise<{ id: string; email: string; status: UserStatus; passwordHash: string | null } | null> {
  const [row] = await db
    .select({ id: user.id, email: user.email, status: user.status, passwordHash: account.password })
    .from(user)
    .leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .where(eq(user.email, normalize(email)));
  return row ?? null;
}

async function findById(id: string): Promise<{ id: string; email: string; status: UserStatus } | null> {
  const [row] = await db
    .select({ id: user.id, email: user.email, status: user.status })
    .from(user)
    .where(eq(user.id, id));
  return row ?? null;
}

/** The user's birth date as "AAAA-MM-DD"; null when not set or the user does not exist. */
async function getBirthDate(id: string): Promise<string | null> {
  const [row] = await db.select({ birthDate: user.birthDate }).from(user).where(eq(user.id, id));
  return row?.birthDate ?? null;
}

/** Sets the birth date of that user only. */
async function setBirthDate(id: string, iso: string): Promise<void> {
  await db.update(user).set({ birthDate: iso }).where(eq(user.id, id));
}

/** Every user except the admin: pending first, then the rest, each group oldest first. */
async function listForAdmin(adminEmail: string): Promise<AdminUserRow[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(ne(user.email, normalize(adminEmail)))
    .orderBy(sql`${user.status} <> 'pending'`, asc(user.createdAt));
}

/**
 * Applies the admin decision when the user is in a valid origin status, stamping `decided_at`.
 * The admin is not a target (`not_found`). Approving an approved user is a no-op `ok`.
 * With `revokeSessions`, the user's sessions end in the same transaction as the status change.
 */
async function transition(
  id: string,
  action: UserAction,
  options: { revokeSessions?: boolean } = {},
): Promise<"ok" | "not_found" | "wrong_state"> {
  const current = await findById(id);
  if (!current || isAdminEmail(current.email)) return "not_found";

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ status: targetStatus(action), decidedAt: new Date() })
      .where(and(eq(user.id, id), inArray(user.status, fromStatuses(action))))
      .returning({ id: user.id });
    if (rows.length > 0 && options.revokeSessions) await tx.delete(session).where(eq(session.userId, id));
    return rows.length > 0;
  });
  if (updated) return "ok";

  // No row matched: re-read, since the status may have changed since the first read.
  const now = await findById(id);
  if (!now) return "not_found";
  return action === "approve" && now.status === "approved" ? "ok" : "wrong_state";
}

/** Ends every session of the user. */
async function revokeSessions(id: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, id));
}

/** Deletes the user (sessions, accounts and data cascade) and the login attempts of the e-mail. */
async function remove(id: string): Promise<"ok" | "not_found"> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ email: user.email }).from(user).where(eq(user.id, id));
    if (!row) return "not_found";
    await tx.delete(user).where(eq(user.id, id));
    await tx.delete(loginAttempt).where(eq(loginAttempt.email, normalize(row.email)));
    return "ok";
  });
}

export const usersRepo = {
  createPending,
  findByEmail,
  findById,
  getBirthDate,
  setBirthDate,
  listForAdmin,
  transition,
  revokeSessions,
  remove,
};
