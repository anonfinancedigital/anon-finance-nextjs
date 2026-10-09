"use client";

import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const FILE_NAME = "chave-de-recuperacao-vertice.txt";

/**
 * Shows the recovery key once (SIGILO-18). The dialog cannot be dismissed: no close button, Esc and
 * clicks outside are ignored; `Continuar` unlocks only after the user confirms the key is saved.
 */
export function RecoveryKeyDialog({
  recoveryKey,
  open,
  onConfirmed,
}: {
  recoveryKey: string;
  open: boolean;
  onConfirmed: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const checkboxId = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
    } catch {
      // Clipboard blocked: the key stays on screen to copy by hand or download.
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`${recoveryKey}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
  }

  const prevent = (event: Event) => event.preventDefault();

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={prevent}
        onPointerDownOutside={prevent}
        onInteractOutside={prevent}
      >
        <DialogHeader>
          <DialogTitle>Sua chave de recuperação</DialogTitle>
          <DialogDescription>
            Ela é a única forma de recuperar seus dados se você esquecer a senha. Guarde-a em um lugar seguro: ela não
            será exibida de novo.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm break-all select-all">
          {recoveryKey}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={copy}>
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            {copied ? "Copiada" : "Copiar"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={download}>
            <DownloadIcon aria-hidden />
            Baixar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={checkboxId} checked={saved} onCheckedChange={(checked) => setSaved(checked === true)} />
          <Label htmlFor={checkboxId}>Guardei minha chave de recuperação</Label>
        </div>
        <Button type="button" disabled={!saved} onClick={onConfirmed}>
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
