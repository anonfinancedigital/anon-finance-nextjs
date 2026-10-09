import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { targetCents } from "@/lib/domain/freedom";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db, pool } from "../client";
import { financialGoal } from "../schema";

setupTestDb();

const BIRTH_DATE = "1990-06-15";

const SAVED_FIELDS = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 15_000_000,
  retirementAge: 60,
  annualRateBp: 800,
  withdrawalRateBp: 600,
};

const GOAL = SAVED_FIELDS;

const insertUser = () => insertTestUser(BIRTH_DATE);

const rowsOf = (userId: string) => db.select().from(financialGoal).where(eq(financialGoal.userId, userId));

/** Writes the legacy plain-text columns directly: these tests cover the table constraints, not the repository. */
const putPlain = (userId: string, goal: typeof SAVED_FIELDS) =>
  db
    .insert(financialGoal)
    .values({ userId, ...goal })
    .onConflictDoUpdate({ target: financialGoal.userId, set: goal });

/** The plain-text columns of the user's row, or `null` when there is none. */
async function plainOf(userId: string) {
  const [row] = await rowsOf(userId);
  if (!row) return null;
  const { monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp } = row;
  return { monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp };
}

/** Name of the constraint the write violated, or `null` when it succeeded. */
async function violatedConstraint(write: Promise<unknown>): Promise<string | null> {
  try {
    await write;
    return null;
  } catch (error) {
    const pgError = ((error as { cause?: unknown }).cause ?? error) as { constraint?: string };
    return pgError.constraint ?? "unknown";
  }
}

describe("financial_goal rate constraints (plain-text columns)", () => {
  it("returns 800 for a row inserted without an annual rate", async () => {
    const userId = await insertUser();
    const { monthlyIncomeCents, savedCents, retirementAge } = GOAL;
    await db
      .insert(financialGoal)
      .values({ userId, monthlyIncomeCents, savedCents, retirementAge, withdrawalRateBp: 600 });

    expect((await plainOf(userId))?.annualRateBp).toBe(800);
  });

  it.each([
    ["annual 100 and withdrawal 100", 100, 100],
    ["annual 1500 and withdrawal 100", 1500, 100],
    ["annual 1500 and withdrawal 1500", 1500, 1500],
    ["withdrawal equal to the annual rate (6% / 6%)", 600, 600],
  ])("accepts the CHECK boundary (%s)", async (_label, annualRateBp, withdrawalRateBp) => {
    const userId = await insertUser();
    await putPlain(userId, { ...GOAL, annualRateBp, withdrawalRateBp });
    expect(await plainOf(userId)).toMatchObject({ annualRateBp, withdrawalRateBp });
  });

  it.each([
    ["annual rate 99", 99, 99, "financial_goal_annual_rate"],
    ["annual rate 1501", 1501, 600, "financial_goal_annual_rate"],
    ["withdrawal rate 99", 600, 99, "financial_goal_withdrawal_rate"],
    ["withdrawal above the annual rate (7% / 6%)", 600, 700, "financial_goal_withdrawal_rate"],
  ])("refuses %s at the database and keeps the previous goal", async (_label, annualRateBp, withdrawalRateBp, constraint) => {
    const userId = await insertUser();
    await putPlain(userId, GOAL);

    expect(await violatedConstraint(putPlain(userId, { ...GOAL, annualRateBp, withdrawalRateBp }))).toBe(constraint);
    expect(await plainOf(userId)).toEqual(GOAL);
  });
});

describe("migration 0011 (withdrawal rate backfill)", () => {
  const migration = (file: string) =>
    readFileSync(join(process.cwd(), "drizzle", file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

  it("fills the withdrawal rate of existing goals from the table 6→4%, 8→6%, 10→7% without changing the target", async () => {
    const users = [await insertUser(), await insertUser(), await insertUser()];
    const client = await pool.connect();
    try {
      // Rebuilds financial_goal as it stood before 0011 in a scratch schema, then rolls everything back.
      await client.query("BEGIN");
      await client.query("CREATE SCHEMA before_0011");
      await client.query("SET LOCAL search_path TO before_0011");
      for (const statement of [...migration("0005_demonic_vermin.sql"), ...migration("0009_bored_thunderball.sql")]) {
        await client.query(statement);
      }
      await client.query(
        `INSERT INTO financial_goal (user_id, monthly_income_cents, saved_cents, birth_date, retirement_age, annual_rate_bp)
         VALUES ($1, 2000000, 0, '1990-06-15', 60, 600), ($2, 2000000, 0, '1990-06-15', 60, 800), ($3, 2000000, 0, '1990-06-15', 60, 1000)`,
        users,
      );

      for (const statement of migration("0011_withdrawal_rate.sql")) await client.query(statement);

      const { rows } = await client.query<{ user_id: string; annual_rate_bp: number; withdrawal_rate_bp: number }>(
        "SELECT user_id, annual_rate_bp, withdrawal_rate_bp FROM financial_goal",
      );
      const byUser = Object.fromEntries(rows.map((r) => [r.user_id, [r.annual_rate_bp, r.withdrawal_rate_bp]]));
      expect(byUser).toEqual({ [users[0]]: [600, 400], [users[1]]: [800, 600], [users[2]]: [1000, 700] });
      // The targets stay as before the migration: R$ 20.000,00/mês gives R$ 6.000.000,00, 4.000.000,00 and 3.428.571,43.
      expect(rows.map((r) => targetCents(2_000_000, r.withdrawal_rate_bp)).sort((a, b) => a - b)).toEqual([
        342_857_143, 400_000_000, 600_000_000,
      ]);

      const { rows: columns } = await client.query<{ is_nullable: string }>(
        "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'before_0011' AND table_name = 'financial_goal' AND column_name = 'withdrawal_rate_bp'",
      );
      expect(columns).toEqual([{ is_nullable: "NO" }]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});

describe("financial_goal range constraints (plain-text columns)", () => {
  it.each([
    ["income 0", { monthlyIncomeCents: 0 }],
    ["income above R$ 1.000.000,00", { monthlyIncomeCents: 100_000_001 }],
    ["negative saved", { savedCents: -1 }],
    ["saved above R$ 999.999.999,99", { savedCents: 100_000_000_000 }],
    ["retirement age 0", { retirementAge: 0 }],
    ["retirement age 121", { retirementAge: 121 }],
  ])("refuses a value outside the CHECK range (%s) and keeps the previous goal", async (_label, override) => {
    const userId = await insertUser();
    await putPlain(userId, GOAL);

    await expect(putPlain(userId, { ...GOAL, ...override })).rejects.toThrow();
    expect(await plainOf(userId)).toEqual(GOAL);
  });

  it.each([
    ["income 1", { monthlyIncomeCents: 1 }],
    ["income R$ 1.000.000,00", { monthlyIncomeCents: 100_000_000 }],
    ["saved 0", { savedCents: 0 }],
    ["saved R$ 999.999.999,99", { savedCents: 99_999_999_999 }],
    ["retirement age 1", { retirementAge: 1 }],
    ["retirement age 120", { retirementAge: 120 }],
  ])("accepts the CHECK boundary (%s)", async (_label, override) => {
    const userId = await insertUser();
    const goal = { ...GOAL, ...override };
    await putPlain(userId, goal);
    expect(await plainOf(userId)).toEqual(goal);
  });
});
