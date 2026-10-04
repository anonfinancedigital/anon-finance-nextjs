import { pool } from "../src/lib/db/client";
import { seedAdminFromEnv } from "../src/lib/db/seed-user";
import { migrateTestDb, truncateAll } from "../src/test/db-reset";

/** Migrates the test database, empties it and seeds the admin account (ADMIN_EMAIL/ADMIN_PASSWORD). */
export default async function globalSetup() {
  try {
    await migrateTestDb();
    await truncateAll();
    await seedAdminFromEnv();
  } finally {
    await pool.end();
  }
}
