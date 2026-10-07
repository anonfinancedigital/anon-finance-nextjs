"use client";

import { Check, Info, Settings } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { RadioGroup } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRESET_RATES, targetCents } from "@/lib/domain/freedom";
import { formatRate, RATE_TITLE, withdrawalTooltip } from "@/lib/domain/freedom-copy";
import { cn } from "cn";

export type RateValue = "6" | "8" | "10";

const CUSTOM = "custom";
const TITLES = ["Conservador", "Moderado", "Agressivo"] as const;

const options = PRESET_RATES.map((preset, i) => ({
  value: String(preset.annualBp / 100) as RateValue,
  title: TITLES[i],
  rate: `${formatRate(preset.annualBp)} real a.a.`,
  withdrawalBp: preset.withdrawalBp,
}));

const CARD_CLASS = cn(
  "relative flex min-w-0 flex-col rounded-lg border border-input bg-field text-xs text-muted-foreground transition-colors",
  "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/15 has-data-[state=checked]:text-link",
  "has-focus-visible:ring-2 has-focus-visible:ring-primary/30",
);

// The radio covers the whole card (stretched ::after); the info button sits above it.
const RADIO_CLASS =
  "flex cursor-pointer flex-col items-start gap-0.5 px-3 pt-2 pb-1 text-left outline-none after:absolute after:inset-0 after:rounded-lg";

/**
 * Scenario cards (radiogroup named by RATE_TITLE): name, then real accumulation rate, then the
 * withdrawal rate with an info tooltip. The selected card shows a check; with a rate pair outside
 * the presets only "Personalizado" is selected. The "Personalizar premissas" button below opens the
 * rate fields. `monthlyIncomeCents` feeds the tooltip example and hides it when unknown.
 */
export function RateToggle({
  value,
  onChange,
  onCustom,
  customActive,
  monthlyIncomeCents = null,
}: {
  value: RateValue | null;
  onChange: (rate: RateValue) => void;
  onCustom: () => void;
  customActive: boolean;
  monthlyIncomeCents?: number | null;
}) {
  const selected = customActive || value === null ? CUSTOM : value;

  return (
    <div className="space-y-2">
      <RadioGroup
        aria-label={RATE_TITLE}
        value={selected}
        onValueChange={(next) => (next === CUSTOM ? onCustom() : onChange(next as RateValue))}
        className="grid-cols-2 items-stretch gap-2"
      >
        {options.map((option) => (
          <div key={option.value} className={CARD_CLASS}>
            <RadioGroupPrimitive.Item value={option.value} className={RADIO_CLASS}>
              <span className="flex w-full items-center justify-between gap-1 text-sm font-medium">
                {option.title}
                <Check aria-hidden className="hidden size-4 in-data-[state=checked]:block" />
              </span>
              <span>{option.rate}</span>
            </RadioGroupPrimitive.Item>
            <div className="flex items-center gap-1 px-3 pb-2 text-[11px]">
              <span>Retirada: {formatRate(option.withdrawalBp)} a.a.</span>
              {monthlyIncomeCents !== null && (
                <WithdrawalInfo
                  text={withdrawalTooltip({
                    withdrawalBp: option.withdrawalBp,
                    targetCents: targetCents(monthlyIncomeCents, option.withdrawalBp),
                    monthlyIncomeCents,
                  })}
                />
              )}
            </div>
          </div>
        ))}
        <div className={CARD_CLASS}>
          <RadioGroupPrimitive.Item value={CUSTOM} className={cn(RADIO_CLASS, "pb-2")}>
            <span className="flex w-full items-center justify-between gap-1 text-sm font-medium">
              Personalizado
              <Check aria-hidden className="hidden size-4 in-data-[state=checked]:block" />
            </span>
            <span>Você define as taxas</span>
          </RadioGroupPrimitive.Item>
        </div>
      </RadioGroup>
      <button
        type="button"
        aria-pressed={customActive}
        onClick={onCustom}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30",
          customActive && "font-medium text-link",
        )}
      >
        <Settings aria-hidden className="size-4" />
        Personalizar premissas
      </button>
    </div>
  );
}

/** Info icon with the withdrawal tooltip: opens on hover and focus, Escape closes it. */
function WithdrawalInfo({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="O que é a taxa de retirada"
          className="relative z-10 inline-flex cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Info aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
