"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";

export type GoalFormValues = {
  /** pt-BR text, e.g. "10.000,00". */
  monthlyIncome: string;
  /** pt-BR text, e.g. "150.000,00". */
  saved: string;
  /** AAAA-MM-DD. */
  birthDate: string;
  retirementAge: string;
};

const blank: GoalFormValues = { monthlyIncome: "", saved: "", birthDate: "", retirementAge: "" };

/**
 * Form of the financial freedom goal. Without a saved goal it shows empty; with one it stays
 * collapsed behind an "Editar objetivo" button and opens filled with the saved values.
 */
export function GoalForm({ initial }: { initial?: GoalFormValues }) {
  const uid = useId();
  const router = useRouter();
  const [values, setValues] = useState<GoalFormValues>(initial ?? blank);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!initial);

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const field = (name: string) => `${uid}-${name}`;

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await saveGoal(values);
      setResult(res);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function cancel() {
    setValues(initial ?? blank);
    setResult(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Button type="button" variant="outline" onClick={() => setEditing(true)}>
        Editar objetivo
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Objetivo de liberdade financeira">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={field("monthlyIncome")}>Renda mensal desejada (R$)</Label>
          <Input
            id={field("monthlyIncome")}
            inputMode="decimal"
            placeholder="10.000,00"
            value={values.monthlyIncome}
            aria-invalid={!!fieldErrors.monthlyIncome}
            onChange={(e) => set("monthlyIncome", e.target.value)}
          />
          {fieldErrors.monthlyIncome && (
            <p className="text-sm text-destructive">{fieldErrors.monthlyIncome}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("saved")}>Valor já guardado (R$)</Label>
          <Input
            id={field("saved")}
            inputMode="decimal"
            placeholder="0,00"
            value={values.saved}
            aria-invalid={!!fieldErrors.saved}
            onChange={(e) => set("saved", e.target.value)}
          />
          {fieldErrors.saved && <p className="text-sm text-destructive">{fieldErrors.saved}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("birthDate")}>Data de nascimento</Label>
          <Input
            id={field("birthDate")}
            type="date"
            value={values.birthDate}
            aria-invalid={!!fieldErrors.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
          />
          {fieldErrors.birthDate && (
            <p className="text-sm text-destructive">{fieldErrors.birthDate}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("retirementAge")}>Idade de aposentadoria</Label>
          <Input
            id={field("retirementAge")}
            inputMode="numeric"
            placeholder="60"
            value={values.retirementAge}
            aria-invalid={!!fieldErrors.retirementAge}
            onChange={(e) => set("retirementAge", e.target.value)}
          />
          {fieldErrors.retirementAge && (
            <p className="text-sm text-destructive">{fieldErrors.retirementAge}</p>
          )}
        </div>
      </div>

      {result && !result.ok && !Object.keys(fieldErrors).length && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
        {initial && (
          <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
