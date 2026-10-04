// Creates (or resets the password of) the single account from ADMIN_EMAIL and ADMIN_PASSWORD.
// Usage: npm run db:seed  (reads .env* like Next.js; DATABASE_URL may also be given inline)
import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  // Imported after the env is loaded: the pool reads DATABASE_URL on creation.
  const { seedAdminFromEnv } = await import("../src/lib/db/seed-user");
  const { pool } = await import("../src/lib/db/client");
  try {
    await seedAdminFromEnv();
    console.log(`Account ready: ${process.env.ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
