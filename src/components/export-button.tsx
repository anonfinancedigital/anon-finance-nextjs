"use client";

import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { exportDataAction } from "@/actions/account";
import { LOAD_ERROR_MESSAGE } from "@/components/load-error";
import { Button } from "@/components/ui/button";
import { useVault } from "@/components/vault-provider";
import { buildExport, exportFileName, openExport } from "@/lib/vault/export";

/**
 * "Exportar meus dados" (SIGILO-36): the server returns only sealed rows of the session user
 * (SIGILO-37); the browser opens them and downloads `orcamento-dados-AAAA-MM-DD.json`.
 */
export function ExportButton() {
  const { dek, userId } = useVault();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setPending(true);
    setError(false);
    try {
      const result = await exportDataAction();
      if (!result.ok) {
        setError(true);
        return;
      }
      const json = buildExport(await openExport(dek, userId, result.data));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(new Date());
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={pending} onClick={download}>
        <DownloadIcon aria-hidden />
        {pending ? "Preparando..." : "Exportar meus dados"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {LOAD_ERROR_MESSAGE}
        </p>
      )}
    </div>
  );
}
