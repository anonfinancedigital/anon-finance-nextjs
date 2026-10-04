import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { user } from "@/lib/db/auth-schema";
import { db, pool } from "@/lib/db/client";
import { migrateTestDb, truncateAll } from "./db-reset";

/** Call once at the top of an integration test file. */
export function setupTestDb() {
  beforeAll(migrateTestDb);
  beforeEach(truncateAll);
  afterAll(() => pool.end());
}

/** Inserts a bare user row (no credentials) and returns its id. */
export async function insertTestUser(): Promise<string> {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Teste", email: `${id}@example.com` });
  return id;
}
