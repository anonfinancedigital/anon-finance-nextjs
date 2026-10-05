"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RateToggle, type RateValue } from "@/components/rate-toggle";
import { Slider } from "@/components/ui/slider";
import type { ActionResult } from "@/lib/action-result";
import { brToIso, maskDateInput } from "@/lib/domain/date-br";
import { ageOn } from "@/lib/domain/freedom";
import { today } from "@/lib/validation/goal";

export type GoalFormValues = {
  /** pt-BR text, e.g. "10.000,00". */
  monthlyIncome: string;
  /** pt-BR text, e.g. "150.000,00". */
  saved: string;
  /** DD/MM/AAAA. */
  birthDate: string;
  retirementAge: string;
  /** "6", "8" or "10" (% ao ano). */
  annualRate: string;
};

const MAX_SLIDER_AGE = 90;

const blank: GoalFormValues = { monthlyIncome: "", saved: "", birthDate: "", retirementAge: "", annualRate: "8" };

/**
 * Form of the financial freedom goal, filled with the saved values or empty without a saved goal.
 * The host decides when it is shown: `onDraftChange` gets the values at every edit, `onSaved`
 * runs after a successful save and `onCancel` when the user gives up.
 */
export function GoalForm({
  initial,
  onDraftChange,
  onSaved,
  onCancel,
  nowIso,
}: {
  initial?: GoalFormValues;
  onDraftChange?: (values: GoalFormValues) => void;
  onSaved?: () => void;
  onCancel?: () => void;
  nowIso?: string;
}) {
  const uid = useId();
  const router = useRouter();
  const [values, setValues] = useState<GoalFormValues>(initial ?? blank);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const field = (name: string) => `${uid}-${name}`;

  // The slider range starts the year after the current age, which needs a valid birth date.
  const birthIso = brToIso(values.birthDate);
  const currentAge = birthIso ? ageOn(birthIso, today(nowIso ? new Date(nowIso) : new Date())) : null;
  const sliderMin = currentAge === null ? 1 : currentAge + 1;
  const sliderDisabled = currentAge === null || sliderMin > MAX_SLIDER_AGE;
  const typedAge = Number(values.retirementAge);
  const sliderValue = Math.min(MAX_SLIDER_AGE, Math.max(sliderMin, Number.isFinite(typedAge) ? typedAge : sliderMin));

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    onDraftChange?.(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await saveGoal(values);
      setResult(res);
      if (res.ok) {
        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Objetivo de liberdade financeira">
      <div className="grid gap-3">
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
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={values.birthDate}
            aria-invalid={!!fieldErrors.birthDate}
            onChange={(e) => set("birthDate", maskDateInput(e.target.value))}
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
          <Slider
            aria-label="Idade de aposentadoria (controle deslizante)"
            min={sliderMin}
            max={MAX_SLIDER_AGE}
            step={1}
            value={[sliderValue]}
            disabled={sliderDisabled}
            onValueChange={([age]) => set("retirementAge", String(age))}
            className="pt-2"
          />
          <p className="text-xs text-muted-foreground">
            {sliderDisabled ? "Informe a data de nascimento para usar o controle" : `De ${sliderMin} a ${MAX_SLIDER_AGE} anos`}
          </p>
          {fieldErrors.retirementAge && (
            <p className="text-sm text-destructive">{fieldErrors.retirementAge}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Taxa esperada ao ano</p>
        <p className="text-xs text-muted-foreground">Taxa real estimada (descontada a inflação)</p>
        <RateToggle
          value={values.annualRate === "6" || values.annualRate === "10" ? (values.annualRate as RateValue) : "8"}
          onChange={(rate) => set("annualRate", rate)}
        />
        {fieldErrors.annualRate && <p className="text-sm text-destructive">{fieldErrors.annualRate}</p>}
      </div>

      {result && !result.ok && !Object.keys(fieldErrors).length && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-popover py-3">
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
