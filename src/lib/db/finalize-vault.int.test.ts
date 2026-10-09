import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { insertLegacyAccount } from "@/test/legacy";
import { finalizeVault } from "../../../scripts/finalize-vault";
import { db } from "./client";
import type { Tx } from "./repos/vault";
import { category, categoryPercent, financialGoal, subcategory, transaction, userVault } from "./schema";

setupTestDb();

/** Thrown at the end of a test transaction so that every DDL inside it is rolled back. */
class Rollback extends Error {}

/** Runs `body` in a transaction that is always rolled back; rethrows anything but the sentinel. */
async function inRolledBackTx(body: (tx: Tx) => Promise<void>) {
  await expect(
    db.transaction(async (tx) => {
      await body(tx);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}

const TABLES = ["transaction", "category", "subcategory", "category_percent", "financial_goal", "user", "user_vault"];

type Executor = Pick<Tx, "execute">;

/** Columns (with nullability), CHECK constraints and indexes of the tables the finalization touches. */
async function schemaSnapshot(executor: Executor) {
  const list = sql.join(
    TABLES.map((t) => sql`${t}`),
    sql`, `,
  );
  const columns = await executor.execute(sql`
    SELECT table_name, column_name, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN (${list}) ORDER BY table_name, column_name`);
  const checks = await executor.execute(sql`
    SELECT conrelid::regclass::text AS table_name, conname FROM pg_constraint
    WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY 1, 2`);
  const indexes = await executor.execute(sql`
    SELECT tablename, indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN (${list}) ORDER BY 1, 2`);
  return { columns: columns.rows, checks: checks.rows, indexes: indexes.rows };
}

async function columnsOf(executor: Executor, table: string) {
  const { rows } = await executor.execute<{ column_name: string; is_nullable: string }>(sql`
    SELECT column_name, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}`);
  return Object.fromEntries(rows.map((r) => [r.column_name, r.is_nullable]));
}

/** An account with a vault and one sealed row in every sealed table. */
async function insertSealedAccount() {
  const userId = await insertTestUser();
  await db.insert(userVault).values({
    userId,
    salt: "AAAAAAAAAAAAAAAAAAAAAA",
    memKib: 65536,
    iterations: 3,
    parallelism: 1,
    dekWrappedPw: "v1:pw",
    dekWrappedRecovery: "v1:recovery",
    birthDateCt: "v1:nascimento",
  });
  const [cat] = await db.insert(category).values({ userId, nameCt: "v1:moradia", color: 2 }).returning();
  await db.insert(categoryPercent).values({ categoryId: cat.id, fromMonth: "0001-01-01", percentCt: "v1:trinta" });
  const [sub] = await db
    .insert(subcategory)
    .values({ userId, categoryId: cat.id, nameCt: "v1:aluguel" })
    .returning();
  const expenseId = randomUUID();
  await db.insert(transaction).values({
    id: expenseId,
    userId,
    kind: "expense",
    amountCt: "v1:valor",
    descriptionCt: "v1:mercado",
    date: "2026-10-05",
    categoryId: cat.id,
    subcategoryId: sub.id,
  });
  await db.insert(financialGoal).values({
    userId,
    monthlyIncomeCt: "v1:renda",
    savedCt: "v1:guardado",
    retirementAgeCt: "v1:idade",
    annualRateCt: "v1:taxa",
    withdrawalRateCt: "v1:retirada",
    annualRateBp: null, // the plain column has a default (800); a sealed goal has it NULL
  });
  return { userId, categoryId: cat.id, subcategoryId: sub.id, expenseId };
}

/** Every sealed value of the database, read with raw SQL so it works after the plain columns are gone. */
async function sealedData(executor: Executor) {
  const q = async (query: ReturnType<typeof sql>) => (await executor.execute(query)).rows;
  return {
    vault: await q(sql`SELECT user_id, dek_wrapped_pw, dek_wrapped_recovery, birth_date_ct FROM user_vault ORDER BY 1`),
    categories: await q(sql`SELECT id, user_id, name_ct, color FROM category ORDER BY 1`),
    percents: await q(sql`SELECT category_id, from_month, percent_ct FROM category_percent ORDER BY 1, 2`),
    subcategories: await q(sql`SELECT id, category_id, name_ct FROM subcategory ORDER BY 1`),
    transactions: await q(sql`SELECT id, user_id, amount_ct, description_ct FROM "transaction" ORDER BY 1`),
    goals: await q(sql`
      SELECT user_id, monthly_income_ct, saved_ct, retirement_age_ct, annual_rate_ct, withdrawal_rate_ct
      FROM financial_goal ORDER BY 1`),
  };
}

describe("finalizeVault", () => {
  it("refuses with the count of legacy accounts and changes neither the schema nor the data", async () => {
    await insertSealedAccount();
    const legacy = await insertLegacyAccount();
    await insertLegacyAccount();
    const before = await schemaSnapshot(db);
    const legacyTxBefore = (await db.execute(sql`SELECT * FROM "transaction" ORDER BY id`)).rows;

    await inRolledBackTx(async (tx) => {
      await expect(finalizeVault(tx)).rejects.toThrow(/2 conta\(s\) sem cofre/);
      // Same transaction, after the refusal: nothing was altered before the throw.
      expect(await schemaSnapshot(tx)).toEqual(before);
    });

    expect(await schemaSnapshot(db)).toEqual(before);
    expect((await db.execute(sql`SELECT * FROM "transaction" ORDER BY id`)).rows).toEqual(legacyTxBefore);
    const [row] = (await db.execute(sql`SELECT birth_date FROM "user" WHERE id = ${legacy.userId}`)).rows;
    expect(row).toEqual({ birth_date: "1990-05-17" });
  });

  it("without legacy accounts drops the plain columns, their checks and name indexes, and sets the *_ct NOT NULL", async () => {
    await insertSealedAccount();
    const before = await schemaSnapshot(db);

    await inRolledBackTx(async (tx) => {
      await finalizeVault(tx);

      const t = await columnsOf(tx, "transaction");
      expect(t).not.toHaveProperty("amount_cents");
      expect(t).not.toHaveProperty("description");
      expect(t).toMatchObject({ amount_ct: "NO", description_ct: "YES" });

      const c = await columnsOf(tx, "category");
      expect(c).not.toHaveProperty("name");
      expect(c).toMatchObject({ name_ct: "NO" });

      const s = await columnsOf(tx, "subcategory");
      expect(s).not.toHaveProperty("name");
      expect(s).toMatchObject({ name_ct: "NO" });

      const p = await columnsOf(tx, "category_percent");
      expect(p).not.toHaveProperty("percent_micro");
      expect(p).toMatchObject({ percent_ct: "NO" });

      const g = await columnsOf(tx, "financial_goal");
      for (const plain of ["monthly_income_cents", "saved_cents", "retirement_age", "annual_rate_bp", "withdrawal_rate_bp"]) {
        expect(g).not.toHaveProperty(plain);
      }
      expect(g).toMatchObject({
        monthly_income_ct: "NO",
        saved_ct: "NO",
        retirement_age_ct: "NO",
        annual_rate_ct: "NO",
        withdrawal_rate_ct: "NO",
      });

      expect(await columnsOf(tx, "user")).not.toHaveProperty("birth_date");
      expect(await columnsOf(tx, "user_vault")).toMatchObject({ birth_date_ct: "YES" });

      const after = await schemaSnapshot(tx);
      const checkNames = after.checks.map((r) => r.conname);
      for (const gone of [
        "transaction_amount_plain_xor_ct",
        "transaction_description_not_both",
        "transaction_amount_cents_range",
        "category_name_plain_xor_ct",
        "subcategory_name_plain_xor_ct",
        "category_percent_plain_xor_ct",
        "category_percent_micro_range",
        "financial_goal_plain_xor_ct",
        "financial_goal_income_range",
        "financial_goal_saved_range",
        "financial_goal_retirement_age_range",
        "financial_goal_annual_rate",
        "financial_goal_withdrawal_rate",
      ]) {
        expect(checkNames).not.toContain(gone);
      }
      // Checks unrelated to the plain columns stay.
      expect(checkNames).toEqual(
        expect.arrayContaining(["category_color_range", "transaction_recurring_fields", "user_status_valid"]),
      );
      const indexNames = after.indexes.map((r) => r.indexname);
      expect(indexNames).not.toContain("category_user_lower_name_unique");
      expect(indexNames).not.toContain("subcategory_category_lower_name_unique");
      expect(indexNames).toContain("transaction_user_date_idx");
    });

    expect(await schemaSnapshot(db)).toEqual(before);
  });

  it("keeps every sealed value and row when it finalizes", async () => {
    await insertSealedAccount();
    await insertSealedAccount();
    const before = await sealedData(db);
    expect(before.transactions).toHaveLength(2);

    await inRolledBackTx(async (tx) => {
      await finalizeVault(tx);
      expect(await sealedData(tx)).toEqual(before);
    });

    expect(await sealedData(db)).toEqual(before);
  });

  it("finalizes an empty database (no account at all)", async () => {
    await inRolledBackTx(async (tx) => {
      await finalizeVault(tx);
      expect(await columnsOf(tx, "user")).not.toHaveProperty("birth_date");
    });
  });
});
