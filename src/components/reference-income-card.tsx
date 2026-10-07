"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputAffix } from "@/components/input-affix";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, parseBRL } from "@/lib/domain/money";

/**
 * Shows "Base de cálculo mensal: R$ X" with an "Editar base" button, or the income field while editing
 * or when the text is empty or invalid. `value` is the raw text; the parent owns it.
 */
export function ReferenceIncomeCard({
  value,
  onChange,
  initialValue = "",
}: {
  value: string;
  onChange: (text: string) => void;
  /** Text the field started with (the month's income); while `value` still equals it, the help text says so. */
  initialValue?: string;
}) {
  const [editing, setEditing] = useState(false);
  // Focus the field only when the user opened it with "Editar base", not on first render.
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  const parsed = value.trim() === "" ? null : parseBRL(value);
  const invalid = !!parsed && !parsed.ok;

  if (parsed?.ok && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-lg">
        <p className="text-sm">
          Base de cálculo mensal: <span className="font-medium">{formatBRL(parsed.value)}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFocusOnOpen(true);
            setEditing(true);
          }}
        >
          Editar base
        </Button>
      </div>
    );
  }

  const help =
    value.trim() === ""
      ? "Informe para ver os valores em R$."
      : value === initialValue && initialValue !== ""
        ? "Preenchido com a receita do mês; edite para simular."
        : null;

  function finish() {
    if (!invalid) {
      setEditing(false);
      setFocusOnOpen(false);
    }
  }

  return (
    <div className="space-y-1 rounded-2xl border border-border bg-card px-4 py-2 shadow-lg">
      <Label htmlFor="reference-income">Receita Base Mensal</Label>
      <div className="max-w-xs">
        <InputAffix prefix="R$">
          <Input
            id="reference-income"
            inputMode="decimal"
            placeholder="5.000,00"
            value={value}
            autoFocus={focusOnOpen}
            aria-invalid={invalid}
            onChange={(e) => {
              // Typing keeps the field open even when the text becomes valid mid-way.
              setEditing(true);
              onChange(e.target.value);
            }}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Inside the editor form, Enter would submit it.
              e.preventDefault();
              finish();
            }}
          />
        </InputAffix>
      </div>
      {parsed && !parsed.ok && <p className="text-sm text-destructive">{parsed.error}</p>}
      {help && <p className="text-sm text-muted-foreground">{help}</p>}
    </div>
  );
}
