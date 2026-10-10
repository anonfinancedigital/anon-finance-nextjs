// Opções do pool do pg. Função pura: o ambiente entra por argumento, então roda no Vitest sem abrir conexão.
import type { PoolConfig } from "pg";

// Na Vercel cada instância serverless tem o seu pool; o teto baixo evita esgotar as conexões do Neon gratuito.
const MAX_ON_VERCEL = 3;
const MAX_DEFAULT = 10;
const IDLE_TIMEOUT_MS = 10_000;

export function poolOptions(env: Record<string, string | undefined>): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: env.VERCEL ? MAX_ON_VERCEL : MAX_DEFAULT,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
  };
}
