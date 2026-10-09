import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, asc, eq } from "drizzle-orm";
import type { LegacyPackage, LegacyPlain, VaultMaterial } from "@/lib/vault/types";
import { account, user } from "../auth-schema";
import { db } from "../client";
import { category, categoryPercent, financialGoal, plain, subcategory, transaction, userVault } from "../schema";
import { type Tx, vaultRepo } from "./vault";

/** What the browser sends to finish the migration: the sealed rows plus the new login secret and vault. */
export type LegacyCommit = LegacyPackage & {
  authSecret: string;
  vault: VaultMaterial;
};

export type ReadPlainResult = { ok: true; plain: LegacyPlain } | { ok: false; reason: "not_legacy" };

export type CommitMigrationResult = "ok" | "wrong_password" | "not_legacy" | "mismatch";

/** A legacy account is an existing user without a `user_vault` row. */
async function isLegacy(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id, vault: userVault.userId })
    .from(user)
    .leftJoin(userVault, eq(userVault.userId, user.id))
    .where(eq(user.id, userId));
  return row !== undefined && row.vault === null;
}

/**
 * Reads the plain-text rows of the user once, for the migration: transactions (raw, with series
 * fields), categories (deleted ones too) with every percent version and subcategory, the goal and
 * the birth date. `not_legacy` when the user has a vault (or does not exist). Only that user's rows.
 */
async function readPlain(userId: string): Promise<ReadPlainResult> {
  if (!(await isLegacy(userId))) return { ok: false, reason: "not_legacy" };

  const txRows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .orderBy(asc(transaction.createdAt), asc(transaction.id));
  const categoryRows = await db
    .select()
    .from(category)
    .where(eq(category.userId, userId))
    .orderBy(asc(category.createdAt), asc(category.id));
  const versionRows = await db
    .select({
      categoryId: categoryPercent.categoryId,
      fromMonth: categoryPercent.fromMonth,
      percentMicro: categoryPercent.percentMicro,
    })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId))
    .orderBy(asc(categoryPercent.fromMonth));
  const subRows = await db
    .select()
    .from(subcategory)
    .where(eq(subcategory.userId, userId))
    .orderBy(asc(subcategory.createdAt), asc(subcategory.id));
  const [goal] = await db.select().from(financialGoal).where(eq(financialGoal.userId, userId));
  const [owner] = await db.select({ birthDate: user.birthDate }).from(user).where(eq(user.id, userId));

  const versionsOf = new Map<string, { fromMonth: string; percentMicro: number }[]>();
  for (const v of versionRows) {
    versionsOf.set(v.categoryId, [
      ...(versionsOf.get(v.categoryId) ?? []),
      { fromMonth: v.fromMonth, percentMicro: plain(v.percentMicro, "category_percent.percent_micro") },
    ]);
  }
  const subsOf = new Map<string, { id: string; name: string }[]>();
  for (const s of subRows) {
    subsOf.set(s.categoryId, [
      ...(subsOf.get(s.categoryId) ?? []),
      { id: s.id, name: plain(s.name, "subcategory.name") },
    ]);
  }

  return {
    ok: true,
    plain: {
      transactions: txRows.map((t) => ({
        id: t.id,
        kind: t.kind,
        date: t.date,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        amountCents: plain(t.amountCents, "transaction.amount_cents"),
        description: t.description,
        recurring: t.recurring,
        recurrenceDay: t.recurrenceDay,
        recurrenceEnd: t.recurrenceEnd,
        seriesId: t.seriesId,
      })),
      categories: categoryRows.map((c) => ({
        id: c.id,
        name: plain(c.name, "category.name"),
        color: c.color,
        isInvestment: c.isInvestment,
        deletedFrom: c.deletedFrom,
        versions: versionsOf.get(c.id) ?? [],
        subcategories: subsOf.get(c.id) ?? [],
      })),
      goal:
        goal &&
        goal.monthlyIncomeCents !== null &&
        goal.savedCents !== null &&
        goal.retirementAge !== null &&
        goal.annualRateBp !== null &&
        goal.withdrawalRateBp !== null
          ? {
              monthlyIncomeCents: goal.monthlyIncomeCents,
              savedCents: goal.savedCents,
              retirementAge: goal.retirementAge,
              annualRateBp: goal.annualRateBp,
              withdrawalRateBp: goal.withdrawalRateBp,
            }
          : null,
      birthDate: owner?.birthDate ?? null,
    },
  };
}

/** Same members, no repeats: the package must cover exactly the ids stored. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return set.size === a.length && b.every((x) => set.has(x));
}

/** The ids the database holds for the user, in the shape `sameSet` compares. */
async function storedKeys(tx: Tx, userId: string) {
  const txs = await tx.select({ id: transaction.id }).from(transaction).where(eq(transaction.userId, userId));
  const cats = await tx.select({ id: category.id }).from(category).where(eq(category.userId, userId));
  const subs = await tx.select({ id: subcategory.id }).from(subcategory).where(eq(subcategory.userId, userId));
  const versions = await tx
    .select({ categoryId: categoryPercent.categoryId, fromMonth: categoryPercent.fromMonth })
    .from(categoryPercent)
    .innerJoin(category, eq(category.id, categoryPercent.categoryId))
    .where(eq(category.userId, userId));
  return {
    transactions: txs.map((r) => r.id),
    categories: cats.map((r) => r.id),
    subcategories: subs.map((r) => r.id),
    versions: versions.map((v) => `${v.categoryId}|${v.fromMonth}`),
  };
}

/**
 * Finishes the migration in ONE transaction (any error undoes it all, SIGILO-24). Order of answers:
 * `not_legacy` (the account has a vault), `wrong_password` (`oldPassword` against the credential
 * hash), `mismatch` (the package must hold exactly the stored ids of transactions, categories,
 * subcategories and percent versions, and a goal / birth date exactly when the account has one).
 * Then it writes the `*_ct` columns, sets every plain-text column to NULL (the goal's
 * `annual_rate_bp` explicitly, since it has a DEFAULT), creates the vault and swaps the credential
 * hash for `hashPassword(authSecret)`. The user row is locked so two commits cannot interleave.
 */
async function commitMigration(
  userId: string,
  oldPassword: string,
  pkg: LegacyCommit,
): Promise<CommitMigrationResult> {
  const newHash = await hashPassword(pkg.authSecret);
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ birthDate: user.birthDate })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const [vault] = await tx.select({ id: userVault.userId }).from(userVault).where(eq(userVault.userId, userId));
    if (!owner || vault) return "not_legacy";

    const [credential] = await tx
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    if (!credential?.password) return "wrong_password";
    if (!(await verifyPassword({ hash: credential.password, password: oldPassword }))) return "wrong_password";

    const [goal] = await tx.select({ id: financialGoal.userId }).from(financialGoal).where(eq(financialGoal.userId, userId));
    const stored = await storedKeys(tx, userId);
    const covers =
      sameSet(stored.transactions, pkg.transactions.map((t) => t.id)) &&
      sameSet(stored.categories, pkg.categories.map((c) => c.id)) &&
      sameSet(stored.subcategories, pkg.categories.flatMap((c) => c.subcategories.map((s) => s.id))) &&
      sameSet(stored.versions, pkg.categories.flatMap((c) => c.versions.map((v) => `${c.id}|${v.fromMonth}`))) &&
      Boolean(goal) === Boolean(pkg.goal) &&
      Boolean(owner.birthDate) === Boolean(pkg.birthDateCt);
    if (!covers) return "mismatch";

    for (const t of pkg.transactions) {
      await tx
        .update(transaction)
        .set({ amountCents: null, description: null, amountCt: t.amountCt, descriptionCt: t.descriptionCt })
        .where(and(eq(transaction.id, t.id), eq(transaction.userId, userId)));
    }
    for (const c of pkg.categories) {
      await tx
        .update(category)
        .set({ name: null, nameCt: c.nameCt })
        .where(and(eq(category.id, c.id), eq(category.userId, userId)));
      for (const v of c.versions) {
        await tx
          .update(categoryPercent)
          .set({ percentMicro: null, percentCt: v.percentCt })
          .where(and(eq(categoryPercent.categoryId, c.id), eq(categoryPercent.fromMonth, v.fromMonth)));
      }
      for (const s of c.subcategories) {
        await tx
          .update(subcategory)
          .set({ name: null, nameCt: s.nameCt })
          .where(and(eq(subcategory.id, s.id), eq(subcategory.userId, userId)));
      }
    }
    if (pkg.goal) {
      await tx
        .update(financialGoal)
        .set({
          monthlyIncomeCents: null,
          savedCents: null,
          retirementAge: null,
          annualRateBp: null,
          withdrawalRateBp: null,
          ...pkg.goal,
        })
        .where(eq(financialGoal.userId, userId));
    }

    await vaultRepo.create(tx, userId, pkg.vault);
    if (pkg.birthDateCt) {
      await tx.update(userVault).set({ birthDateCt: pkg.birthDateCt }).where(eq(userVault.userId, userId));
    }
    await tx.update(user).set({ birthDate: null }).where(eq(user.id, userId));
    await tx
      .update(account)
      .set({ password: newHash })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    return "ok";
  });
}

export const legacyRepo = { isLegacy, readPlain, commitMigration };
