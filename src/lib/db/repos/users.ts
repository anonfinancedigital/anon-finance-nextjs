import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { fromStatuses, targetStatus, type UserAction, type UserStatus } from "@/lib/domain/user-status";
import { account, session, user } from "../auth-schema";
import { db } from "../client";
import { loginAttempt, userVault } from "../schema";
import type { VaultMaterial } from "@/lib/vault/types";
import { vaultRepo } from "./vault";

const normalize = (email: string) => email.trim().toLowerCase();

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
};

/**
 * Creates a pending user for the sealed signup: the id comes from the client (the AAD of its sealed fields
 * already names it), the credential hash is Better Auth's `hashPassword(authSecret)` (the server
 * never sees the password), and the vault row (key material + sealed birth date) is written in the
 * same transaction. A repeated e-mail (any case) is `duplicate` and nothing is written; a repeated
 * id throws (primary key) and rolls everything back.
 */
async function createPendingSealed(input: {
  id: string;
  name: string;
  email: string;
  authSecret: string;
  vault: VaultMaterial;
  birthDateCt?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "duplicate" }> {
  const hash = await hashPassword(input.authSecret);
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(user)
      .values({ id: input.id, name: input.name, email: normalize(input.email), status: "pending" })
      .onConflictDoNothing({ target: user.email })
      .returning({ id: user.id });
    if (inserted.length === 0) return { ok: false, reason: "duplicate" } as const;
    await tx.insert(account).values({
      id: randomUUID(),
      userId: input.id,
      accountId: input.id,
      providerId: "credential",
      password: hash,
    });
    await vaultRepo.create(tx, input.id, input.vault);
    if (input.birthDateCt) {
      await tx.update(userVault).set({ birthDateCt: input.birthDateCt }).where(eq(userVault.userId, input.id));
    }
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
 * The admin is not a target (`not_found`). Reactivating an approved user is a no-op `ok`.
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
  return action === "reactivate" && now.status === "approved" ? "ok" : "wrong_state";
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
  createPendingSealed,
  findByEmail,
  findById,
  listForAdmin,
  transition,
  revokeSessions,
  remove,
};
