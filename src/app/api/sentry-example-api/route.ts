// Valida a integração com o Sentry: lança um erro de servidor fora de produção e some (404) em produção.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  throw new Error("Erro de servidor de exemplo do Sentry");
}
