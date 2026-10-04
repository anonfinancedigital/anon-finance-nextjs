import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/lib/db/client";

// Test-runner agnostic (shared by Vitest and Playwright): no test-framework imports here.

function assertTestDatabase() {
  const name = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to touch non-test database "${name}"`);
  }
}

export async function migrateTestDb() {
  assertTestDatabase();
  await migrate(db, { migrationsFolder: "drizzle" });
}

/** Empties every table in the public schema (migration history lives in the "drizzle" schema). */
export async function truncateAll() {
  assertTestDatabase();
  const { rows } = await pool.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
