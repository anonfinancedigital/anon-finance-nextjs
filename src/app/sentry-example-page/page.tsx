import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExampleButtons } from "./example-buttons";

export const metadata: Metadata = { title: "Teste do Sentry" };

/** Valida o Sentry manualmente. Pública e fora de produção; em produção responde 404. */
export default function SentryExamplePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste do Sentry</CardTitle>
          <CardDescription>
            Cada botão gera um erro de propósito. Com o DSN configurado, ele aparece como uma issue no Sentry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExampleButtons />
        </CardContent>
      </Card>
    </main>
  );
}
