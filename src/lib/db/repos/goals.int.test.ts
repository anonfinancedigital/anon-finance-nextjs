import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { targetCents } from "@/lib/domain/freedom";
import { insertTestUser, setupTestDb } from "@/test/db";
import { user } from "../auth-schema";
import { db, pool } from "../client";
import { financialGoal } from "../schema";
import { goalsRepo } from "./goals";

setupTestDb();

/** The user's birth date lives in `user.birth_date`, not in the goal row. */
const BIRTH_DATE = "1990-06-15";

const SAVED_FIELDS = {
  monthlyIncomeCents: 1_000_000,
  savedCents: 15_000_000,
  retirementAge: 60,
  annualRateBp: 800,
  withdrawalRateBp: 600,
};

/** What `upsert` receives. */
const GOAL = SAVED_FIELDS;

/** What `get` returns: the goal plus the birth date of its user. */
const WITH_BIRTH = { ...SAVED_FIELDS, birthDate: BIRTH_DATE };

const insertUser = () => insertTestUser(BIRTH_DATE);

const rowsOf = (userId: string) => db.select().from(financialGoal).where(eq(financialGoal.userId, userId));

describe("goalsRepo.get", () => {
  it("returns null when the user has no goal", async () => {
    const userId = await insertUser();
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("returns null when the user has a goal but no birth date", async () => {
    const userId = await insertTestUser();
    await goalsRepo.upsert(userId, GOAL);
    expect(await rowsOf(userId)).toHaveLength(1);
    expect(await goalsRepo.get(userId)).toBeNull();
  });

  it("returns the birth date of the user, not of another one", async () => {
    const userId = await insertTestUser("1985-02-28");
    const otherId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    await goalsRepo.upsert(otherId, GOAL);
    expect(await goalsRepo.get(userId)).toEqual({ ...GOAL, birthDate: "1985-02-28" });
    expect(await goalsRepo.get(otherId)).toEqual(WITH_BIRTH);
  });

  it("returns the saved goal after upsert", async () => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    expect(await goalsRepo.get(userId)).toEqual(WITH_BIRTH);
  });

  it("does not show one user's goal to another", async () => {
    const userId = await insertUser();
    const otherId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    expect(await goalsRepo.get(otherId)).toBeNull();

    const otherGoal = { ...GOAL, savedCents: 0, retirementAge: 65 };
    await goalsRepo.upsert(otherId, otherGoal);
    expect(await goalsRepo.get(otherId)).toEqual({ ...otherGoal, birthDate: BIRTH_DATE });
    expect(await goalsRepo.get(userId)).toEqual(WITH_BIRTH);
  });
});

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

describe("goalsRepo rates", () => {
  it.each([
    [600, 400],
    [800, 600],
    [1000, 700],
  ])("saves and returns the preset pair %d / %d", async (annualRateBp, withdrawalRateBp) => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp, withdrawalRateBp });
    expect(await goalsRepo.get(userId)).toMatchObject({ annualRateBp, withdrawalRateBp });
  });

  it("saves and returns a custom pair: 6,5% with 4,5% withdrawal", async () => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp: 650, withdrawalRateBp: 450 });

    expect(await goalsRepo.get(userId)).toEqual({ ...WITH_BIRTH, annualRateBp: 650, withdrawalRateBp: 450 });
    expect(await rowsOf(userId)).toMatchObject([{ annualRateBp: 650, withdrawalRateBp: 450 }]);
  });

  it("replaces both rates on a second upsert in the same row", async () => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp: 600, withdrawalRateBp: 400 });
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp: 650, withdrawalRateBp: 450 });

    expect(await goalsRepo.get(userId)).toMatchObject({ annualRateBp: 650, withdrawalRateBp: 450 });
    expect(await rowsOf(userId)).toHaveLength(1);
  });

  it("returns 800 for a row inserted without an annual rate", async () => {
    const userId = await insertUser();
    const { monthlyIncomeCents, savedCents, retirementAge } = GOAL;
    await db
      .insert(financialGoal)
      .values({ userId, monthlyIncomeCents, savedCents, retirementAge, withdrawalRateBp: 600 });

    expect((await goalsRepo.get(userId))?.annualRateBp).toBe(800);
  });

  it.each([
    ["annual 100 and withdrawal 100", 100, 100],
    ["annual 1500 and withdrawal 100", 1500, 100],
    ["annual 1500 and withdrawal 1500", 1500, 1500],
    ["withdrawal equal to the annual rate (6% / 6%)", 600, 600],
  ])("accepts the CHECK boundary (%s)", async (_label, annualRateBp, withdrawalRateBp) => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, { ...GOAL, annualRateBp, withdrawalRateBp });
    expect(await goalsRepo.get(userId)).toMatchObject({ annualRateBp, withdrawalRateBp });
  });

  it.each([
    ["annual rate 99", 99, 99, "financial_goal_annual_rate"],
    ["annual rate 1501", 1501, 600, "financial_goal_annual_rate"],
    ["withdrawal rate 99", 600, 99, "financial_goal_withdrawal_rate"],
    ["withdrawal above the annual rate (7% / 6%)", 600, 700, "financial_goal_withdrawal_rate"],
  ])("refuses %s at the database and keeps the previous goal", async (_label, annualRateBp, withdrawalRateBp, constraint) => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);

    expect(await violatedConstraint(goalsRepo.upsert(userId, { ...GOAL, annualRateBp, withdrawalRateBp }))).toBe(constraint);
    expect(await goalsRepo.get(userId)).toEqual(WITH_BIRTH);
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

describe("goalsRepo.upsert", () => {
  it("replaces the values on a second upsert and keeps a single row", async () => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    const replacement = {
      monthlyIncomeCents: 500_000,
      savedCents: 0,
      retirementAge: 55,
      annualRateBp: 1000,
      withdrawalRateBp: 700,
    };
    await goalsRepo.upsert(userId, replacement);

    expect(await goalsRepo.get(userId)).toEqual({ ...replacement, birthDate: BIRTH_DATE });
    expect(await rowsOf(userId)).toHaveLength(1);
  });

  it("does not touch another user's row when replacing", async () => {
    const userId = await insertUser();
    const otherId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    await goalsRepo.upsert(otherId, GOAL);
    await goalsRepo.upsert(userId, { ...GOAL, savedCents: 1 });

    expect(await goalsRepo.get(otherId)).toEqual(WITH_BIRTH);
  });

  it("does not write the birth date: it keeps the user's date", async () => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);
    await goalsRepo.upsert(userId, { ...GOAL, savedCents: 1 });

    const [row] = await db.select({ birthDate: user.birthDate }).from(user).where(eq(user.id, userId));
    expect(row.birthDate).toBe(BIRTH_DATE);
    expect(Object.keys((await rowsOf(userId))[0])).not.toContain("birthDate");
  });

  it.each([
    ["income 0", { monthlyIncomeCents: 0 }],
    ["income above R$ 1.000.000,00", { monthlyIncomeCents: 100_000_001 }],
    ["negative saved", { savedCents: -1 }],
    ["saved above R$ 999.999.999,99", { savedCents: 100_000_000_000 }],
    ["retirement age 0", { retirementAge: 0 }],
    ["retirement age 121", { retirementAge: 121 }],
  ])("refuses a value outside the CHECK range (%s) and keeps the previous goal", async (_label, override) => {
    const userId = await insertUser();
    await goalsRepo.upsert(userId, GOAL);

    await expect(goalsRepo.upsert(userId, { ...GOAL, ...override })).rejects.toThrow();
    expect(await goalsRepo.get(userId)).toEqual(WITH_BIRTH);
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
    await goalsRepo.upsert(userId, goal);
    expect(await goalsRepo.get(userId)).toEqual({ ...goal, birthDate: BIRTH_DATE });
  });
});
