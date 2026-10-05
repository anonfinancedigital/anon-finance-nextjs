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
  /** "floating": round "+" fixed on the viewport; "header": labeled button for a card header, from md up. */
  variant?: "floating" | "header";
};

/** Button that opens the new-transaction form in a dialog and closes it on save. */
export function NewTransactionButton({ categories, defaultDate, variant = "floating" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "header" ? (
          <Button className="hidden md:inline-flex">
            <PlusIcon />
            Nova transação
          </Button>
        ) : (
          <Button
            size="icon-lg"
            aria-label="Nova transação"
            className="fixed right-4 bottom-20 z-40 size-[60px] rounded-full shadow-lg md:right-6 md:bottom-6 md:size-[78px]"
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
