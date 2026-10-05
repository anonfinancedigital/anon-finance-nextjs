import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "./client";

const schemaName = "migration_0007_test";

const statementsOf = (file: string) =>
  readFileSync(`drizzle/${file}`, "utf8")
    .replaceAll('"public".', `"${schemaName}".`)
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

const earlier = [
  "0000_auth.sql",
  "0001_domain.sql",
  "0002_category_color.sql",
  "0003_subcategory.sql",
  "0004_recurrence.sql",
  "0005_demonic_vermin.sql",
  "0006_percent_micro.sql",
];

async function apply(client: PoolClient, files: string[]) {
  for (const file of files) for (const statement of statementsOf(file)) await client.query(statement);
}

describe("migration 0007 category_percent backfill", () => {
  let client: PoolClient;

  beforeEach(async () => {
    client = await pool.connect();
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await client.query("SET search_path TO DEFAULT");
    client.release();
  });

  it("creates one 0001-01-01 version per existing category with its current percent", async () => {
    await apply(client, earlier);
    const userA = randomUUID();
    const userB = randomUUID();
    for (const id of [userA, userB]) {
      await client.query(`INSERT INTO "user" (id, name, email) VALUES ($1, 'Teste', $2)`, [
        id,
        `${id}@example.com`,
      ]);
    }
    const seeded: [string, string, number][] = [
      [userA, "Conforto", 33333333],
      [userA, "Lazer", 66666667],
      [userB, "Conforto", 100000000],
    ];
    const ids = new Map<string, number>();
    for (const [userId, name, micro] of seeded) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO category (user_id, name, percent_micro, color) VALUES ($1, $2, $3, 1) RETURNING id`,
        [userId, name, micro],
      );
      ids.set(rows[0].id, micro);
    }

    await apply(client, ["0007_category_percent_history.sql"]);

    const { rows } = await client.query<{ category_id: string; from_month: string; percent_micro: number }>(
      `SELECT category_id, from_month::text AS from_month, percent_micro FROM category_percent`,
    );
    expect(rows).toHaveLength(ids.size);
    for (const row of rows) {
      expect(row.from_month).toBe("0001-01-01");
      expect(row.percent_micro).toBe(ids.get(row.category_id));
    }
    expect(new Set(rows.map((r) => r.category_id))).toEqual(new Set(ids.keys()));
  });

  it("keeps working on a database with no categories", async () => {
    await apply(client, earlier);
    await apply(client, ["0007_category_percent_history.sql"]);
    const { rows } = await client.query(`SELECT 1 FROM category_percent`);
    expect(rows).toHaveLength(0);
  });
});
