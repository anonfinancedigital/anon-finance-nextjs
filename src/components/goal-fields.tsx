"use client";

import { useId, useState } from "react";
import { AgeSlider } from "@/components/age-slider";
import { CurrencyInput } from "@/components/currency-input";
import type { GoalFormValues } from "@/components/goal-form";
import { RateToggle, type RateValue } from "@/components/rate-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brToIso, maskDateInput } from "@/lib/domain/date-br";
import { ageOn, PRESET_RATES, presetFor } from "@/lib/domain/freedom";
import { RATE_HINT, RATE_TITLE } from "@/lib/domain/freedom-copy";
import { maskBRLInput, parseBRL } from "@/lib/domain/money";
import { parseRate, today } from "@/lib/validation/goal";

const MAX_SLIDER_AGE = 90;

const LABELS = {
  drawer: {
    monthlyIncome: "Renda mensal desejada",
    saved: "Valor já guardado",
    birthDate: "Data de nascimento",
    retirementAge: "Idade da independência",
  },
  inline: {
    monthlyIncome: "Renda mensal desejada",
    saved: "Quanto você já tem guardado",
    birthDate: "Data de nascimento",
    retirementAge: "Com que idade quer chegar lá",
  },
} as const;

/** The preset whose pair matches the typed rates, as the selector value; `null` for any other pair. */
function presetOf(values: GoalFormValues): RateValue | null {
  const annual = parseRate(values.annualRate);
  const withdrawal = parseRate(values.withdrawalRate);
  const preset = annual.ok && withdrawal.ok ? presetFor(annual.value, withdrawal.value) : null;
  return preset === null ? null : (String(preset / 100) as RateValue);
}

/**
 * Fields of the goal, shared by the drawer and the empty state. `errors` already holds only the
 * touched fields. The `inline` variant uses the empty-state labels and leaves the scenario selector
 * out (the page offers it through the "Ajustar" chip).
 */
export function GoalFields({
  values,
  set,
  errors,
  nowIso,
  variant,
}: {
  values: GoalFormValues;
  set: (patch: Partial<GoalFormValues>) => void;
  errors: Partial<Record<keyof GoalFormValues, string>>;
  nowIso: string;
  variant: "drawer" | "inline";
}) {
  const uid = useId();
  const field = (name: string) => `${uid}-${name}`;
  const labels = LABELS[variant];
  // Only the visibility of the rate fields: they open when the pair matches no preset or on
  // "Personalizar premissas", and close when a scenario is chosen.
  const [custom, setCustom] = useState(() => presetOf(values) === null);

  // Calculated age only for a valid birth date that is not in the future.
  const birthIso = brToIso(values.birthDate);
  const age = birthIso ? ageOn(birthIso, today(new Date(nowIso))) : null;
  const currentAge = age !== null && age >= 0 ? age : null;
  const sliderMin = currentAge === null ? 1 : currentAge + 1;
  const sliderDisabled = currentAge === null || sliderMin > MAX_SLIDER_AGE;
  const typedAge = Number(values.retirementAge);

  const income = parseBRL(values.monthlyIncome);

  // A preset writes both rates from the table: 6 → 4, 8 → 5, 10 → 6.
  function choosePreset(rate: RateValue) {
    const preset = PRESET_RATES.find((p) => String(p.annualBp / 100) === rate)!;
    setCustom(false);
    set({ annualRate: rate, withdrawalRate: String(preset.withdrawalBp / 100) });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor={field("monthlyIncome")}>{labels.monthlyIncome}</Label>
          <CurrencyInput
            id={field("monthlyIncome")}
            inputMode="decimal"
            placeholder="10.000,00"
            value={values.monthlyIncome}
            aria-invalid={!!errors.monthlyIncome}
            onChange={(e) => set({ monthlyIncome: maskBRLInput(e.target.value) })}
          />
          {errors.monthlyIncome && <p className="text-sm text-destructive">{errors.monthlyIncome}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("saved")}>{labels.saved}</Label>
          <CurrencyInput
            id={field("saved")}
            inputMode="decimal"
            placeholder="0,00"
            value={values.saved}
            aria-invalid={!!errors.saved}
            onChange={(e) => set({ saved: maskBRLInput(e.target.value) })}
          />
          {errors.saved && <p className="text-sm text-destructive">{errors.saved}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("birthDate")}>{labels.birthDate}</Label>
          <div className="flex items-center gap-3">
            <Input
              id={field("birthDate")}
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={values.birthDate}
              aria-invalid={!!errors.birthDate}
              onChange={(e) => set({ birthDate: maskDateInput(e.target.value) })}
            />
            {currentAge !== null && !errors.birthDate && (
              <span className="shrink-0 text-sm text-muted-foreground">{currentAge} anos</span>
            )}
          </div>
          {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("retirementAge")}>{labels.retirementAge}</Label>
          <Input
            id={field("retirementAge")}
            inputMode="numeric"
            placeholder={String(sliderMin)}
            value={values.retirementAge}
            aria-invalid={!!errors.retirementAge}
            onChange={(e) => set({ retirementAge: e.target.value })}
          />
          <AgeSlider
            ariaLabel={`${labels.retirementAge} (controle deslizante)`}
            min={sliderMin}
            max={MAX_SLIDER_AGE}
            value={Number.isFinite(typedAge) && values.retirementAge !== "" ? typedAge : sliderMin}
            disabled={sliderDisabled}
            onChange={(next) => set({ retirementAge: String(next) })}
          />
          {errors.retirementAge && <p className="text-sm text-destructive">{errors.retirementAge}</p>}
        </div>
      </div>

      {variant === "drawer" && (
        <div className="space-y-1">
          <p className="text-sm font-medium">{RATE_TITLE}</p>
          <p className="text-xs text-muted-foreground">{RATE_HINT}</p>
          <RateToggle
            value={presetOf(values)}
            onChange={choosePreset}
            onCustom={() => setCustom(true)}
            customActive={presetOf(values) === null}
            monthlyIncomeCents={income.ok ? income.value : null}
          />
          {custom ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <RateInput
                id={field("annualRate")}
                label="Rentabilidade real ao ano (%)"
                value={values.annualRate}
                error={errors.annualRate}
                onChange={(text) => set({ annualRate: text })}
              />
              <RateInput
                id={field("withdrawalRate")}
                label="Taxa de retirada anual (%)"
                value={values.withdrawalRate}
                error={errors.withdrawalRate}
                onChange={(text) => set({ withdrawalRate: text })}
              />
            </div>
          ) : (
            (errors.annualRate || errors.withdrawalRate) && (
              <p className="text-sm text-destructive">{errors.annualRate ?? errors.withdrawalRate}</p>
            )
          )}
        </div>
      )}
    </div>
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
