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
  /** "floating": round "+" fixed on the viewport, below md; "header": labeled button for a card header, from md up; "inline": labeled button at any width. */
  variant?: "floating" | "header" | "inline";
  /** "secondary" renders the button as `outline`, so another action can be the single filled one. */
  emphasis?: "primary" | "secondary";
};

/** Button that opens the new-transaction form in a dialog and closes it on save. */
export function NewTransactionButton({
  categories,
  defaultDate,
  variant = "floating",
  emphasis = "primary",
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
            Registrar transação
          </Button>
        ) : (
          <Button
            variant={buttonVariant}
            size="icon-lg"
            aria-label="Nova transação"
            className="fixed right-4 bottom-20 z-40 size-[60px] rounded-full shadow-lg md:hidden"
          >
            <PlusIcon className="size-8 md:size-10" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Lançamento</DialogTitle>
        </DialogHeader>
        <TransactionForm
          categories={categories}
          defaultDate={defaultDate}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
