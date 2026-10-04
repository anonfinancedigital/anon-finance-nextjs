import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";
import { db, pool } from "./client";
import { user } from "./auth-schema";
import { category, transaction } from "./schema";

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

async function createCategory(userId: string, name = "Conforto", percentBp = 3000, color = 1) {
  const [row] = await db.insert(category).values({ userId, name, percentBp, color }).returning();
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
  it("accepts percent_bp at the bounds 1 and 10000", async () => {
    const userId = await createUser();
    await createCategory(userId, "Mínimo", 1);
    await createCategory(userId, "Máximo", 10000);
    const rows = await db.select().from(category).where(eq(category.userId, userId));
    expect(rows.map((r) => r.percentBp).sort((a, b) => a - b)).toEqual([1, 10000]);
  });

  it("rejects percent_bp 0", async () => {
    const userId = await createUser();
    expect(await pgErrorCode(createCategory(userId, "Zero", 0))).toBe(CHECK_VIOLATION);
  });

  it("rejects percent_bp 10001", async () => {
    const userId = await createUser();
    expect(await pgErrorCode(createCategory(userId, "Demais", 10001))).toBe(CHECK_VIOLATION);
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
      `INSERT INTO "category" ("user_id", "name", "percent_bp", "color") VALUES ($1, 'Sem cor', 3000, NULL)`,
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
        percentBp: 100,
        color: 5,
        createdAt: new Date(base + i * 1000),
      });
      if (i < 2) {
        await db.insert(category).values({
          userId: otherId,
          name: `Outra ${i + 1}`,
          percentBp: 5000,
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
