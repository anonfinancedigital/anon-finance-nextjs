// Sinal de vida para o monitor de uptime. Não toca o banco, para não acordar o Neon.
// Não lê a requisição: a query string não muda a resposta.
export async function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
