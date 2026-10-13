// Valida a URL pública usada nos links dos e-mails. Função pura: o ambiente entra por argumento.

/**
 * A URL sem barra final, ou `null` quando não serve. Em produção só `https:` é aceito; fora dela,
 * `http:` e `https:` (dev e testes usam `http://localhost`).
 */
export function resolveBaseUrl(raw: string | undefined, nodeEnv: string | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const allowed = nodeEnv === "production" ? ["https:"] : ["https:", "http:"];
  if (!allowed.includes(url.protocol)) return null;
  return raw.replace(/\/+$/, "");
}
