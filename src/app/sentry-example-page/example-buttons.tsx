"use client";

import { Button } from "@/components/ui/button";

export function ExampleButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => {
          // Erro não tratado de navegador: o handler global do Sentry o captura.
          throw new Error("Erro de cliente de exemplo do Sentry");
        }}
      >
        Gerar erro de cliente
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          // A rota lança no servidor; `onRequestError` reporta ao Sentry.
          await fetch("/api/sentry-example-api");
        }}
      >
        Gerar erro de servidor
      </Button>
    </div>
  );
}
