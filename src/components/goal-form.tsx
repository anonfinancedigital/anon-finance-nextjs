"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RateToggle, type RateValue } from "@/components/rate-toggle";
import { Slider } from "@/components/ui/slider";
import type { ActionResult } from "@/lib/action-result";
import { brToIso, maskDateInput } from "@/lib/domain/date-br";
import { ageOn, PRESET_RATES, presetFor } from "@/lib/domain/freedom";
import { RATE_HINT, RATE_TITLE } from "@/lib/domain/freedom-copy";
import { parseRate, today } from "@/lib/validation/goal";

export type GoalFormValues = {
  /** pt-BR text, e.g. "10.000,00". */
  monthlyIncome: string;
  /** pt-BR text, e.g. "150.000,00". */
  saved: string;
  /** DD/MM/AAAA. */
  birthDate: string;
  retirementAge: string;
  /** Real return in % a.a., pt-BR text, e.g. "8" or "6,5". */
  annualRate: string;
  /** Withdrawal rate in % a.a., pt-BR text, e.g. "6" or "4,5". */
  withdrawalRate: string;
};

const MAX_SLIDER_AGE = 90;

const blank: GoalFormValues = {
  monthlyIncome: "",
  saved: "",
  birthDate: "",
  retirementAge: "",
  annualRate: "8",
  withdrawalRate: "6",
};

/** The preset whose pair matches the typed rates, as the selector value; `null` for any other pair. */
function presetOf(values: GoalFormValues): RateValue | null {
  const annual = parseRate(values.annualRate);
  const withdrawal = parseRate(values.withdrawalRate);
  const preset = annual.ok && withdrawal.ok ? presetFor(annual.value, withdrawal.value) : null;
  return preset === null ? null : (String(preset / 100) as RateValue);
}

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
  // Custom mode opens when the saved pair matches no preset, or when the user picks "Definir taxas personalizadas".
  const [custom, setCustom] = useState(() => presetOf(initial ?? blank) === null);
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

  function update(next: GoalFormValues) {
    setValues(next);
    onDraftChange?.(next);
  }

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    update({ ...values, [key]: value });
  }

  // A preset writes both rates from the table: 6 → 4, 8 → 6, 10 → 7.
  function choosePreset(rate: RateValue) {
    const preset = PRESET_RATES.find((p) => String(p.annualBp / 100) === rate)!;
    setCustom(false);
    update({ ...values, annualRate: rate, withdrawalRate: String(preset.withdrawalBp / 100) });
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
          <Label htmlFor={field("monthlyIncome")}>Renda mensal desejada</Label>
          <CurrencyInput
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
          <Label htmlFor={field("saved")}>Valor já guardado</Label>
          <CurrencyInput
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
          <Label htmlFor={field("retirementAge")}>Idade da independência</Label>
          <Input
            id={field("retirementAge")}
            inputMode="numeric"
            placeholder="60"
            value={values.retirementAge}
            aria-invalid={!!fieldErrors.retirementAge}
            onChange={(e) => set("retirementAge", e.target.value)}
          />
          <Slider
            aria-label="Idade da independência (controle deslizante)"
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
        <p className="text-sm font-medium">{RATE_TITLE}</p>
        <p className="text-xs text-muted-foreground">{RATE_HINT}</p>
        <RateToggle
          value={custom ? null : presetOf(values)}
          onChange={choosePreset}
          onCustom={() => setCustom(true)}
          customActive={custom}
        />
        {custom ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <RateInput
              id={field("annualRate")}
              label="Rentabilidade real ao ano (%)"
              value={values.annualRate}
              error={fieldErrors.annualRate}
              onChange={(text) => set("annualRate", text)}
            />
            <RateInput
              id={field("withdrawalRate")}
              label="Taxa de retirada anual (%)"
              value={values.withdrawalRate}
              error={fieldErrors.withdrawalRate}
              onChange={(text) => set("withdrawalRate", text)}
            />
          </div>
        ) : (
          (fieldErrors.annualRate || fieldErrors.withdrawalRate) && (
            <p className="text-sm text-destructive">{fieldErrors.annualRate ?? fieldErrors.withdrawalRate}</p>
          )
        )}
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

/** Rate field in % a.a. with a fixed "%" suffix and its error below. */
function RateInput({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          placeholder="6,5"
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className="pr-8"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-base text-muted-foreground md:text-sm"
        >
          %
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
