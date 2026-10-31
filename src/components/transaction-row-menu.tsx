"use client";

import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "⋯" button of a transaction row, opening a menu with Editar and Excluir. */
export function TransactionRowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  // Hidden below sm: the whole row opens the editor there, which also has "Excluir transação".
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações da transação" className="hidden size-8 sm:inline-flex">
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
