"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  categories: {
    id: string;
    name: string;
    color: number;
    subcategories: { id: string; name: string }[];
  }[];
  /** Date preselected in the form (today in America/Sao_Paulo). */
  defaultDate: string;
  /** "floating": round "+" centered over the bottom navigation bar, below md; "header": labeled button for a card header, from md up; "inline": labeled button at any width. */
  variant?: "floating" | "header" | "inline";
  /** "secondary" renders the button as `outline`, so another action can be the single filled one. */
  emphasis?: "primary" | "secondary";
  /** Text of the "inline" variant (default "Registrar transação"). */
  label?: string;
  /** Runs after a transaction is saved and the dialog has closed. */
  onSaved?: () => void;
};

/** Button that opens the new-transaction form in a dialog and closes it on save. */
export function NewTransactionButton({
  categories,
  defaultDate,
  variant = "floating",
  emphasis = "primary",
  label = "Registrar transação",
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonVariant = emphasis === "secondary" ? "outline" : "default";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "header" ? (
          <Button variant={buttonVariant} className="hidden md:inline-flex">
            <PlusIcon />
            Nova transação
          </Button>
        ) : variant === "inline" ? (
          <Button variant={buttonVariant}>
            <PlusIcon />
            {label}
          </Button>
        ) : (
          <Button
            variant={buttonVariant}
            size="icon-lg"
            aria-label="Nova transação"
            className="fixed bottom-3 left-1/2 z-50 size-14 -translate-x-1/2 rounded-full shadow-lg ring-4 ring-background md:hidden"
          >
            <PlusIcon className="size-7" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 p-4 sm:max-w-md sm:gap-4 sm:p-5">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        <TransactionForm
          categories={categories}
          defaultDate={defaultDate}
          onSaved={() => {
            setOpen(false);
            onSaved?.();
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
