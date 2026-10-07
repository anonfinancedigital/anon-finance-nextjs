"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Light confirmation before throwing away unsaved changes. "Descartar" runs `onDiscard`;
 * "Continuar editando" and Escape run `onKeepEditing`.
 */
export function DiscardDialog({
  open,
  onDiscard,
  onKeepEditing,
}: {
  open: boolean;
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Descartar alterações?</DialogTitle>
          <DialogDescription>
            As alterações que você fez ainda não foram aplicadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onKeepEditing}>
            Continuar editando
          </Button>
          <Button type="button" onClick={onDiscard}>
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
