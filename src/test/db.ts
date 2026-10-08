import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { user } from "@/lib/db/auth-schema";
import { db, pool } from "@/lib/db/client";
import { category, categoryPercent } from "@/lib/db/schema";
import { migrateTestDb, truncateAll } from "./db-reset";

/** Call once at the top of an integration test file. */
export function setupTestDb() {
  beforeAll(migrateTestDb);
  beforeEach(truncateAll);
  afterAll(() => pool.end());
}

/** Inserts a bare user row (no credentials, no birth date unless given as AAAA-MM-DD) and returns its id. */
export async function insertTestUser(birthDate?: string): Promise<string> {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Teste", email: `${id}@example.com`, birthDate });
  return id;
}

/**
 * Inserts a category and its percent version (`fromMonth` defaults to the 0001-01-01 sentinel, in
 * force for every month). Returns the `category` row.
 */
export async function insertCategory(
  userId: string,
  input: { name: string; percentMicro: number; color: number; fromMonth?: string },
) {
  const { name, percentMicro, color, fromMonth = "0001-01-01" } = input;
  const [row] = await db.insert(category).values({ userId, name, color }).returning();
  await db.insert(categoryPercent).values({ categoryId: row.id, fromMonth, percentMicro });
  return row;
}
