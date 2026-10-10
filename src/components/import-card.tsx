"use client";

import { FileUpIcon, UploadIcon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { importDataAction } from "@/actions/import-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVault } from "@/components/vault-provider";
import { SAVE_FAILED } from "@/lib/action-result";
import type { OpenedExport } from "@/lib/vault/export";
import { checkImportFileSize, type ImportSummary, parseImportFile } from "@/lib/vault/import-file";
import { buildImportPayload, ImportTooLargeError } from "@/lib/vault/import-payload";
import { openBirthDate } from "@/lib/vault/open";

const GOAL_SKIPPED =
  "Meta não importada: a idade de aposentadoria é incompatível com a data de nascimento da conta";
const UNAVAILABLE = "Disponível apenas em conta sem transações nem categorias";

type State =
  | { step: "idle" }
  | { step: "invalid"; message: string }
  | { step: "ready"; data: OpenedExport; summary: ImportSummary }
  | { step: "importing"; data: OpenedExport; summary: ImportSummary }
  | { step: "failed"; message: string; data: OpenedExport; summary: ImportSummary }
  | { step: "done"; transactions: number; categories: number; goalSkipped: boolean };

/**
 * "Importar dados" (IMPORT-01): reads an exported file in the browser, shows what it holds and, on
 * confirmation, seals it for this account and sends only ciphertext (IMPORT-02, IMPORT-03). The
 * server decides whether the account is empty; `canImport` only hides the picker up front (IMPORT-18).
 */
export function ImportCard({ canImport, accountBirthDateCt }: { canImport: boolean; accountBirthDateCt: string | null }) {
  const { dek, userId } = useVault();
  const [state, setState] = useState<State>({ step: "idle" });
  const [fileName, setFileName] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be chosen again
    setState({ step: "idle" });
    setFileName(file?.name ?? null);
    if (!file) return;
    const tooLarge = checkImportFileSize(file.size);
    if (tooLarge) return setState({ step: "invalid", message: tooLarge });
    try {
      const parsed = parseImportFile(await file.text());
      setState(parsed.ok ? { step: "ready", data: parsed.data, summary: parsed.summary } : { step: "invalid", message: parsed.error });
    } catch {
      setState({ step: "invalid", message: SAVE_FAILED });
    }
  }

  async function submit(data: OpenedExport, summary: ImportSummary) {
    setState({ step: "importing", data, summary });
    const fail = (message: string) => setState({ step: "failed", message, data, summary });
    let built: Awaited<ReturnType<typeof buildImportPayload>>;
    try {
      const accountBirthDate = await openBirthDate(dek, userId, accountBirthDateCt);
      built = await buildImportPayload({ data, userId, dek, accountBirthDate, now: new Date() });
    } catch (error) {
      return fail(error instanceof ImportTooLargeError ? error.message : SAVE_FAILED);
    }
    try {
      const result = await importDataAction(built.payload);
      if (!result.ok) return fail(result.error === "UNAUTHORIZED" ? SAVE_FAILED : result.error);
      setState({ step: "done", transactions: result.transactions, categories: result.categories, goalSkipped: built.goalSkipped });
    } catch {
      fail(SAVE_FAILED);
    }
  }

  if (state.step === "done") {
    return (
      <div className="space-y-2" role="status">
        <p className="text-sm">
          Importação concluída: {state.transactions} transações, {state.categories} categorias
        </p>
        {state.goalSkipped && (
          <Alert variant="warning">
            <AlertDescription>{GOAL_SKIPPED}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (!canImport) return <p className="text-sm text-muted-foreground">{UNAVAILABLE}</p>;

  const pending = state.step === "importing";
  const loaded = state.step === "ready" || state.step === "importing" || state.step === "failed" ? state : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={picker}
          type="file"
          accept=".json,application/json"
          aria-label="Arquivo de dados exportado"
          className="sr-only"
          disabled={pending}
          onChange={choose}
        />
        <Button type="button" variant="outline" disabled={pending} onClick={() => picker.current?.click()}>
          <FileUpIcon aria-hidden />
          {fileName ? "Trocar arquivo" : "Escolher arquivo"}
        </Button>
        {fileName && <span className="min-w-0 truncate text-sm text-muted-foreground">{fileName}</span>}
      </div>
      {state.step === "invalid" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {loaded && (
        <div className="space-y-3">
          <p className="text-sm">
            {loaded.summary.transactions} transações, {loaded.summary.categories} categorias, {loaded.summary.subcategories} subcategorias
          </p>
          <Button type="button" variant="outline" disabled={pending} onClick={() => submit(loaded.data, loaded.summary)}>
            <UploadIcon aria-hidden />
            {pending ? "Importando..." : "Importar"}
          </Button>
        </div>
      )}
      {state.step === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
