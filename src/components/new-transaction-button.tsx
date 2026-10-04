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
  categories: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  /** Date preselected in the form (today in America/Sao_Paulo). */
  defaultDate: string;
};

/** Floating "+" button that opens the new-transaction form in a dialog and closes it on save. */
export function NewTransactionButton({ categories, defaultDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon-lg"
          aria-label="Nova transação"
          className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-lg"
        >
          <PlusIcon className="size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        <TransactionForm
          categories={categories}
          defaultDate={defaultDate}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
