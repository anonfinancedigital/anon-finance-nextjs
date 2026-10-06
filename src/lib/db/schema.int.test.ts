import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertCategory, setupTestDb } from "@/test/db";
import { db, pool } from "./client";
import { user } from "./auth-schema";
import { category, categoryPercent, subcategory, transaction } from "./schema";

setupTestDb();

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";

/** Postgres SQLSTATE of a failed query (Drizzle wraps the driver error in `cause`). */
async function pgErrorCode(query: Promise<unknown>): Promise<string | undefined> {
  try {
    await query;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
  return undefined;
}

async function createUser() {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Teste", email: `${id}@example.com` });
  return id;
}

/** Category plus its 0001-01-01 percent version, through the shared helper. */
function createCategory(userId: string, name = "Conforto", percentMicro = 30000000, color = 1) {
  return insertCategory(userId, { name, percentMicro, color });
}

/** Category row with no percent version, for tests that insert the versions themselves. */
async function createBareCategory(userId: string, name = "Conforto", color = 1) {
  const [row] = await db.insert(category).values({ userId, name, color }).returning();
  return row;
}

const expense = (userId: string, categoryId: string | null) => ({
  id: randomUUID(),
  userId,
  kind: "expense" as const,
  amountCents: 1000,
  date: "2026-10-04",
  categoryId,
});

describe("category constraints", () => {
  it("accepts a percent version at the bounds 1 and 100000000", async () => {
    const userId = await createUser();
    await createCategory(userId, "Mínimo", 1);
    await createCategory(userId, "Máximo", 100000000);
    const rows = await db.select().from(categoryPercent);
    expect(rows.map((r) => r.percentMicro).sort((a, b) => a - b)).toEqual([1, 100000000]);
  });

  it("rejects a percent version of 0", async () => {
    const userId = await createUser();
    expect(await pgErrorCode(createCategory(userId, "Zero", 0))).toBe(CHECK_VIOLATION);
  });

  it("rejects a percent version of 100000001", async () => {
    const userId = await createUser();
    expect(await pgErrorCode(createCategory(userId, "Demais", 100000001))).toBe(CHECK_VIOLATION);
  });

  it("rejects a duplicate name with different case for the same user", async () => {
    const userId = await createUser();
    await createCategory(userId, "Lazer");
    expect(await pgErrorCode(createCategory(userId, "lazer"))).toBe(UNIQUE_VIOLATION);
  });

  it("allows the same name for different users", async () => {
    await createCategory(await createUser(), "Lazer");
    await createCategory(await createUser(), "lazer");
    expect(await db.$count(category)).toBe(2);
  });
});

describe("category is_investment", () => {
  it("defaults to false when the column is omitted", async () => {
    const userId = await createUser();
    await pool.query(`INSERT INTO "category" ("user_id", "name", "color") VALUES ($1, 'Lazer', 1)`, [userId]);
    const [row] = await db.select().from(category).where(eq(category.userId, userId));
    expect(row.isInvestment).toBe(false);
  });
});

describe("category color", () => {
  it("accepts color at the bounds 1 and 8", async () => {
    const userId = await createUser();
    await createCategory(userId, "Azul", 5000, 1);
    await createCategory(userId, "Vermelho", 5000, 8);
    const rows = await db.select().from(category).where(eq(category.userId, userId));
    expect(rows.map((r) => r.color).sort((a, b) => a - b)).toEqual([1, 8]);
  });

  it.each([[0], [9]])("rejects color %i", async (color) => {
    const userId = await createUser();
    expect(await pgErrorCode(createCategory(userId, "Cor", 3000, color))).toBe(CHECK_VIOLATION);
  });

  it("rejects a null color", async () => {
    const userId = await createUser();
    const query = pool.query(
      `INSERT INTO "category" ("user_id", "name", "color") VALUES ($1, 'Sem cor', NULL)`,
      [userId],
    );
    expect(await pgErrorCode(query)).toBe(NOT_NULL_VIOLATION);
  });
});

describe("migration 0002 color backfill", () => {
  const backfill = readFileSync("drizzle/0002_category_color.sql", "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .find((statement) => statement.startsWith("UPDATE"))!;

  it("colors each user's categories by creation order, cycling after 8", async () => {
    const userId = await createUser();
    const otherId = await createUser();
    // Inserted in reverse creation order (and interleaved with the other user) so neither the
    // insertion order nor the other user's rows can produce the expected numbering by accident.
    const base = Date.parse("2026-01-01T00:00:00Z");
    for (let i = 8; i >= 0; i--) {
      await db.insert(category).values({
        userId,
        name: `Categoria ${i + 1}`,
        color: 5,
        createdAt: new Date(base + i * 1000),
      });
      if (i < 2) {
        await db.insert(category).values({
          userId: otherId,
          name: `Outra ${i + 1}`,
          color: 5,
          createdAt: new Date(base + i * 1000),
        });
      }
    }

    await pool.query(backfill);

    const colors = async (id: string) =>
      (
        await db
          .select({ color: category.color })
          .from(category)
          .where(eq(category.userId, id))
          .orderBy(asc(category.createdAt))
      ).map((r) => r.color);
    expect(await colors(userId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1]);
    expect(await colors(otherId)).toEqual([1, 2]);
  });
});

describe("transaction constraints", () => {
  it("accepts an expense with category and an income without category", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await db.insert(transaction).values(expense(userId, cat.id));
    await db.insert(transaction).values({
      id: randomUUID(),
      userId,
      kind: "income",
      amountCents: 99_999_999_999,
      date: "2026-10-01",
    });
    expect(await db.$count(transaction)).toBe(2);
  });

  it("rejects amount_cents 0", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const query = db.insert(transaction).values({ ...expense(userId, cat.id), amountCents: 0 });
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("rejects an expense without category", async () => {
    const userId = await createUser();
    const query = db.insert(transaction).values(expense(userId, null));
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("rejects an income with category", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const query = db
      .insert(transaction)
      .values({ ...expense(userId, cat.id), kind: "income" as const });
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("blocks deleting a category that has expenses", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await db.insert(transaction).values(expense(userId, cat.id));
    expect(await pgErrorCode(db.delete(category).where(eq(category.id, cat.id)))).toBe(
      FK_VIOLATION,
    );
    expect(await db.$count(category, eq(category.id, cat.id))).toBe(1);
  });
});

async function createSubcategory(userId: string, categoryId: string, name = "Restaurante") {
  const [row] = await db.insert(subcategory).values({ userId, categoryId, name }).returning();
  return row;
}

describe("subcategory constraints", () => {
  it("rejects a duplicate name with different case in the same category", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await createSubcategory(userId, cat.id, "Restaurante");
    expect(await pgErrorCode(createSubcategory(userId, cat.id, "restaurante"))).toBe(
      UNIQUE_VIOLATION,
    );
  });

  it("accepts the same name in different categories", async () => {
    const userId = await createUser();
    const conforto = await createCategory(userId, "Conforto");
    const lazer = await createCategory(userId, "Lazer");
    await createSubcategory(userId, conforto.id, "Restaurante");
    await createSubcategory(userId, lazer.id, "Restaurante");
    expect(await db.$count(subcategory)).toBe(2);
  });

  it("accepts an expense whose subcategory belongs to its category", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const sub = await createSubcategory(userId, cat.id);
    await db.insert(transaction).values({ ...expense(userId, cat.id), subcategoryId: sub.id });
    expect(await db.$count(transaction, eq(transaction.subcategoryId, sub.id))).toBe(1);
  });

  it("rejects an expense whose subcategory belongs to another category", async () => {
    const userId = await createUser();
    const conforto = await createCategory(userId, "Conforto");
    const lazer = await createCategory(userId, "Lazer");
    const sub = await createSubcategory(userId, lazer.id);
    const query = db
      .insert(transaction)
      .values({ ...expense(userId, conforto.id), subcategoryId: sub.id });
    expect(await pgErrorCode(query)).toBe(FK_VIOLATION);
  });

  it("rejects an income with a subcategory", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const sub = await createSubcategory(userId, cat.id);
    const query = db.insert(transaction).values({
      ...expense(userId, null),
      kind: "income" as const,
      subcategoryId: sub.id,
    });
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("blocks deleting a subcategory that has expenses", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const sub = await createSubcategory(userId, cat.id);
    await db.insert(transaction).values({ ...expense(userId, cat.id), subcategoryId: sub.id });
    expect(await pgErrorCode(db.delete(subcategory).where(eq(subcategory.id, sub.id)))).toBe(
      FK_VIOLATION,
    );
    expect(await db.$count(subcategory, eq(subcategory.id, sub.id))).toBe(1);
  });

  it("deletes the subcategories of a category without expenses", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await createSubcategory(userId, cat.id, "Restaurante");
    await createSubcategory(userId, cat.id, "Streaming");
    await db.delete(category).where(eq(category.id, cat.id));
    expect(await db.$count(subcategory)).toBe(0);
  });

  it("keeps existing expenses valid with a null subcategory", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await db.insert(transaction).values(expense(userId, cat.id));
    const [row] = await db.select().from(transaction);
    expect(row.subcategoryId).toBeNull();
  });
});

describe("transaction recurrence constraints", () => {
  /** A recurring expense of 15/10/2026 (series = its own id). */
  async function recurringExpense(overrides: Partial<typeof transaction.$inferInsert> = {}) {
    const userId = await createUser();
    const cat = await createCategory(userId);
    const row = expense(userId, cat.id);
    return db.insert(transaction).values({
      ...row,
      date: "2026-10-15",
      recurring: true,
      recurrenceDay: 15,
      seriesId: row.id,
      ...overrides,
    });
  }

  it("leaves rows without recurrence as not recurring, with the other fields null", async () => {
    const userId = await createUser();
    const cat = await createCategory(userId);
    await db.insert(transaction).values(expense(userId, cat.id));
    const [row] = await db.select().from(transaction);
    expect(row).toMatchObject({
      recurring: false,
      recurrenceDay: null,
      recurrenceEnd: null,
      seriesId: null,
    });
  });

  it("accepts a recurring expense with day and series", async () => {
    await recurringExpense();
    const [row] = await db.select().from(transaction);
    expect(row).toMatchObject({ recurring: true, recurrenceDay: 15, recurrenceEnd: null });
  });

  it.each([
    ["recurring without recurrence_day", { recurrenceDay: null }],
    ["recurring without series_id", { seriesId: null }],
    ["not recurring with recurrence_day", { recurring: false, seriesId: null }],
    ["not recurring with series_id", { recurring: false, recurrenceDay: null }],
  ])("rejects %s", async (_label, overrides) => {
    expect(await pgErrorCode(recurringExpense(overrides))).toBe(CHECK_VIOLATION);
    expect(await db.$count(transaction)).toBe(0);
  });

  it.each([[0], [32]])("rejects recurrence_day %i", async (recurrenceDay) => {
    expect(await pgErrorCode(recurringExpense({ recurrenceDay }))).toBe(CHECK_VIOLATION);
  });

  it("accepts recurrence_day 1 and 31", async () => {
    await recurringExpense({ recurrenceDay: 1 });
    await recurringExpense({ recurrenceDay: 31 });
    const days = (await db.select().from(transaction)).map((r) => r.recurrenceDay);
    expect(days.sort((a, b) => a! - b!)).toEqual([1, 31]);
  });

  it("rejects recurrence_end before the month of the date", async () => {
    const query = recurringExpense({ recurrenceEnd: "2026-09-01" });
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("accepts recurrence_end equal to the month of the date", async () => {
    await recurringExpense({ recurrenceEnd: "2026-10-01" });
    const [row] = await db.select().from(transaction);
    expect(row.recurrenceEnd).toBe("2026-10-01");
  });

  it("rejects recurrence_end on a row that is not recurring", async () => {
    const query = recurringExpense({
      recurring: false,
      recurrenceDay: null,
      seriesId: null,
      recurrenceEnd: "2026-12-01",
    });
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
  });

  it("accepts a recurring income (no category)", async () => {
    const userId = await createUser();
    const id = randomUUID();
    await db.insert(transaction).values({
      id,
      userId,
      kind: "income",
      amountCents: 500000,
      date: "2026-10-05",
      recurring: true,
      recurrenceDay: 5,
      seriesId: id,
    });
    const [row] = await db.select().from(transaction);
    expect(row).toMatchObject({ kind: "income", categoryId: null, recurring: true, seriesId: id });
  });
});

describe("category_percent constraints", () => {
  const insertVersion = (categoryId: string, fromMonth: string, percentMicro: number) =>
    db.insert(categoryPercent).values({ categoryId, fromMonth, percentMicro });

  it("accepts percent_micro at the bounds 1 and 100000000", async () => {
    const a = await createBareCategory(await createUser(), "Mínimo");
    const b = await createBareCategory(await createUser(), "Máximo");
    await insertVersion(a.id, "2026-10-01", 1);
    await insertVersion(b.id, "2026-10-01", 100000000);
    expect(await db.$count(categoryPercent)).toBe(2);
  });

  it("rejects percent_micro 0 and 100000001", async () => {
    const { id } = await createBareCategory(await createUser());
    expect(await pgErrorCode(insertVersion(id, "2026-10-01", 0))).toBe(CHECK_VIOLATION);
    expect(await pgErrorCode(insertVersion(id, "2026-10-01", 100000001))).toBe(CHECK_VIOLATION);
  });

  it("accepts the 0001-01-01 sentinel and rejects a from_month that is not day 1", async () => {
    const { id } = await createBareCategory(await createUser());
    await insertVersion(id, "0001-01-01", 10000000);
    expect(await pgErrorCode(insertVersion(id, "2026-10-15", 10000000))).toBe(CHECK_VIOLATION);
  });

  it("rejects a second row with the same (category_id, from_month)", async () => {
    const { id } = await createBareCategory(await createUser());
    await insertVersion(id, "2026-10-01", 10000000);
    expect(await pgErrorCode(insertVersion(id, "2026-10-01", 20000000))).toBe(UNIQUE_VIOLATION);
    await insertVersion(id, "2026-11-01", 20000000);
  });

  it("rejects a version for a category that does not exist", async () => {
    expect(await pgErrorCode(insertVersion(randomUUID(), "2026-10-01", 10000000))).toBe(FK_VIOLATION);
  });

  it("deleting the category deletes its versions", async () => {
    const { id } = await createBareCategory(await createUser());
    await insertVersion(id, "2026-10-01", 10000000);
    await insertVersion(id, "2026-11-01", 20000000);
    await db.delete(category).where(eq(category.id, id));
    expect(await db.$count(categoryPercent)).toBe(0);
  });
});

describe("category soft delete name reuse", () => {
  it("allows a name already used by a category with deleted_from set", async () => {
    const userId = await createUser();
    const old = await createCategory(userId, "Lazer");
    await db.update(category).set({ deletedFrom: "2026-10-01" }).where(eq(category.id, old.id));
    await createCategory(userId, "lazer");
    expect(await db.$count(category, eq(category.userId, userId))).toBe(2);
  });

  it("still rejects a duplicate name between active categories", async () => {
    const userId = await createUser();
    await createCategory(userId, "Lazer");
    expect(await pgErrorCode(createCategory(userId, "LAZER"))).toBe(UNIQUE_VIOLATION);
  });

  it("allows deleting two categories with the same name over time", async () => {
    const userId = await createUser();
    const first = await createCategory(userId, "Lazer");
    await db.update(category).set({ deletedFrom: "2026-09-01" }).where(eq(category.id, first.id));
    const second = await createCategory(userId, "Lazer");
    await db.update(category).set({ deletedFrom: "2026-10-01" }).where(eq(category.id, second.id));
    expect(await db.$count(category, eq(category.userId, userId))).toBe(2);
  });
});

describe("user status", () => {
  it("defaults to pending when a user is inserted without status", async () => {
    const id = randomUUID();
    await pool.query(`INSERT INTO "user" ("id", "name", "email") VALUES ($1, 'Teste', $2)`, [
      id,
      `${id}@example.com`,
    ]);
    const [row] = await db.select().from(user).where(eq(user.id, id));
    expect(row.status).toBe("pending");
    expect(row.decidedAt).toBeNull();
  });

  it("accepts each of the four statuses", async () => {
    for (const status of ["pending", "approved", "rejected", "revoked"] as const) {
      const id = randomUUID();
      await db.insert(user).values({ id, name: "Teste", email: `${id}@example.com`, status });
    }
    const statuses = (await db.select({ status: user.status }).from(user)).map((r) => r.status);
    expect(statuses.sort()).toEqual(["approved", "pending", "rejected", "revoked"]);
  });

  it("rejects a status outside the four values", async () => {
    const id = randomUUID();
    const query = pool.query(
      `INSERT INTO "user" ("id", "name", "email", "status") VALUES ($1, 'Teste', $2, 'banned')`,
      [id, `${id}@example.com`],
    );
    expect(await pgErrorCode(query)).toBe(CHECK_VIOLATION);
    expect(await db.$count(user)).toBe(0);
  });
});

describe("migration 0012 user status", () => {
  const scratch = "migration_0012_test";
  const journal: { entries: { tag: string }[] } = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const statementsOf = (tag: string) =>
    readFileSync(`drizzle/${tag}.sql`, "utf8")
      .replaceAll('"public".', `"${scratch}".`)
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
  const tags = journal.entries.map((e) => e.tag);
  const target = tags.indexOf("0012_user_status");

  it("marks every existing user as approved and leaves new inserts pending", async () => {
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${scratch}" CASCADE`);
      await client.query(`CREATE SCHEMA "${scratch}"`);
      await client.query(`SET search_path TO "${scratch}"`);
      for (const tag of tags.slice(0, target)) {
        for (const statement of statementsOf(tag)) await client.query(statement);
      }
      for (const email of ["a@example.com", "b@example.com"]) {
        await client.query(`INSERT INTO "user" (id, name, email) VALUES ($1, 'Antigo', $2)`, [
          randomUUID(),
          email,
        ]);
      }

      for (const statement of statementsOf(tags[target])) await client.query(statement);

      const existing = await client.query<{ status: string; decided_at: Date | null }>(
        `SELECT status, decided_at FROM "user"`,
      );
      expect(existing.rows).toEqual([
        { status: "approved", decided_at: null },
        { status: "approved", decided_at: null },
      ]);
      await client.query(`INSERT INTO "user" (id, name, email) VALUES ($1, 'Novo', 'c@example.com')`, [
        randomUUID(),
      ]);
      const { rows } = await client.query<{ status: string }>(
        `SELECT status FROM "user" WHERE email = 'c@example.com'`,
      );
      expect(rows[0].status).toBe("pending");
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS "${scratch}" CASCADE`);
      await client.query("SET search_path TO DEFAULT");
      client.release();
    }
  });
});
