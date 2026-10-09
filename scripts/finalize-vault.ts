// Finalização da cifra (SIGILO-14, SIGILO-25): remove do banco as colunas em texto puro do legado.
//
// Uso: npm run db:finalize-vault  (lê .env* como o Next.js; DATABASE_URL também pode vir inline)
//
// ATENÇÃO, OPERADOR:
// - BACKUP PRÉVIO OBRIGATÓRIO: faça e confira um backup completo do banco (ex.: pg_dump) ANTES de rodar.
//   Este script não faz backup.
// - IRREVERSÍVEL: as colunas em texto puro (valores, descrições, nomes, percentuais, meta e data de
//   nascimento) são apagadas com tudo o que contêm. Sem o backup, não há como recuperá-las.
// - Só rode quando TODAS as contas já migraram para a cifra (todas têm linha em `user_vault`). Se
//   restar qualquer conta legada, o script recusa, informa a contagem e não altera nada.
// - Tudo roda em UMA transação: ou o esquema inteiro é finalizado, ou nada muda.
// - Rode com o app parado (janela de manutenção): o código atual ainda declara as colunas removidas.
//
// Passo seguinte: publicar o follow-up que remove essas colunas (e os CHECK/índices) de
// `src/lib/db/schema.ts` e `src/lib/db/auth-schema.ts`, junto com o código legado que ainda as lê, e só
// então religar o app.
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import type { Tx } from "../src/lib/db/repos/vault";

/** Plain-text columns dropped per table; the matching `*_ct` columns stay. */
export const DROPPED_COLUMNS = {
  transaction: ["amount_cents", "description"],
  category: ["name"],
  subcategory: ["name"],
  category_percent: ["percent_micro"],
  financial_goal: ["monthly_income_cents", "saved_cents", "retirement_age", "annual_rate_bp", "withdrawal_rate_bp"],
  user: ["birth_date"],
} as const;

/** Range and plain-xor-sealed CHECKs that depend on the dropped columns (names from schema.ts / 0015). */
const DROPPED_CHECKS = {
  transaction: ["transaction_amount_plain_xor_ct", "transaction_description_not_both", "transaction_amount_cents_range"],
  category: ["category_name_plain_xor_ct"],
  subcategory: ["subcategory_name_plain_xor_ct"],
  category_percent: ["category_percent_plain_xor_ct", "category_percent_micro_range"],
  financial_goal: [
    "financial_goal_plain_xor_ct",
    "financial_goal_income_range",
    "financial_goal_saved_range",
    "financial_goal_retirement_age_range",
    "financial_goal_annual_rate",
    "financial_goal_withdrawal_rate",
  ],
} as const;

/** Unique name indexes over the plain names (a sealed name cannot be compared by the server). */
const DROPPED_INDEXES = ["category_user_lower_name_unique", "subcategory_category_lower_name_unique"] as const;

/** Sealed columns that become NOT NULL (`description_ct` and `user_vault.birth_date_ct` stay optional). */
const REQUIRED_SEALED = {
  transaction: ["amount_ct"],
  category: ["name_ct"],
  subcategory: ["name_ct"],
  category_percent: ["percent_ct"],
  financial_goal: ["monthly_income_ct", "saved_ct", "retirement_age_ct", "annual_rate_ct", "withdrawal_rate_ct"],
} as const;

export class LegacyAccountsRemainError extends Error {
  constructor(readonly count: number) {
    super(`Finalização recusada: ${count} conta(s) sem cofre (user_vault). Nada foi alterado.`);
    this.name = "LegacyAccountsRemainError";
  }
}

/**
 * Inside `tx`: refuses (throws, altering nothing) while any user has no `user_vault`; otherwise drops
 * the plain-text columns with their CHECKs and unique name indexes and makes the required `*_ct`
 * columns NOT NULL. The caller commits or rolls back.
 */
export async function finalizeVault(tx: Tx): Promise<{ droppedColumns: string[] }> {
  // Blocks new users and vault changes until the end of the transaction, so the check stays true.
  await tx.execute(sql`LOCK TABLE "user", user_vault IN SHARE MODE`);
  const { rows } = await tx.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count FROM "user" u
    WHERE NOT EXISTS (SELECT 1 FROM user_vault v WHERE v.user_id = u.id)`);
  const legacy = rows[0]?.count ?? 0;
  if (legacy > 0) throw new LegacyAccountsRemainError(legacy);

  for (const index of DROPPED_INDEXES) {
    await tx.execute(sql`DROP INDEX ${sql.identifier(index)}`);
  }

  const droppedColumns: string[] = [];
  for (const [table, columns] of Object.entries(DROPPED_COLUMNS)) {
    const checks: readonly string[] = DROPPED_CHECKS[table as keyof typeof DROPPED_CHECKS] ?? [];
    const required: readonly string[] = REQUIRED_SEALED[table as keyof typeof REQUIRED_SEALED] ?? [];
    const actions = [
      ...checks.map((name) => sql`DROP CONSTRAINT ${sql.identifier(name)}`),
      ...columns.map((name) => sql`DROP COLUMN ${sql.identifier(name)}`),
      ...required.map((name) => sql`ALTER COLUMN ${sql.identifier(name)} SET NOT NULL`),
    ];
    await tx.execute(sql`ALTER TABLE ${sql.identifier(table)} ${sql.join(actions, sql`, `)}`);
    droppedColumns.push(...columns.map((name) => `${table}.${name}`));
  }
  return { droppedColumns };
}

async function main() {
  loadEnvConfig(process.cwd());
  // Imported after the env is loaded: the pool reads DATABASE_URL on creation.
  const { db, pool } = await import("../src/lib/db/client");
  try {
    const { droppedColumns } = await db.transaction((tx) => finalizeVault(tx));
    console.log(`Finalização concluída. Colunas removidas (${droppedColumns.length}):`);
    for (const column of droppedColumns) console.log(`- ${column}`);
    console.log("Próximo passo: publicar o follow-up que remove essas colunas de schema.ts.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
