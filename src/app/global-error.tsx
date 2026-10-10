"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // SPEC_DEVIATION: a task pede `reset()`, mas o Next 16.3 documenta `retry()` como o caminho recomendado
  // (error.md: "In most cases, you should use retry() instead"); `retry` refaz a busca e re-renderiza.
  retry: () => void;
}) {
  useEffect(() => {
    // O erro vai ao Sentry (scrubEvent remove a mensagem); a tela nunca a exibe.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">{BRAND_NAME}</p>
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="max-w-md text-muted-foreground">
          Ocorreu um erro inesperado. Seus dados continuam protegidos. Tente novamente em instantes.
        </p>
        <Button onClick={() => retry()}>Tentar novamente</Button>
      </body>
    </html>
  );
}
