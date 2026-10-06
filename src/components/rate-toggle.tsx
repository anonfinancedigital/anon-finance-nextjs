"use client";

import { Settings } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { RadioGroup } from "@/components/ui/radio-group";
import { PRESET_RATES } from "@/lib/domain/freedom";
import { formatRate, RATE_TITLE } from "@/lib/domain/freedom-copy";
import { cn } from "cn";

export type RateValue = "6" | "8" | "10";

const TITLES = ["Conservador", "Moderado", "Agressivo"] as const;

const options = PRESET_RATES.map((preset, i) => ({
  value: String(preset.annualBp / 100) as RateValue,
  title: TITLES[i],
  rate: `${formatRate(preset.annualBp)} real a.a.`,
  withdrawal: `Retirada: ${formatRate(preset.withdrawalBp)} a.a.`,
}));

/**
 * Three equal profile buttons (radiogroup named by RATE_TITLE) with the real accumulation rate and
 * the withdrawal rate, plus the "Personalizar premissas" text button below. With the custom option active no
 * profile is highlighted.
 */
export function RateToggle({
  value,
  onChange,
  onCustom,
  customActive,
}: {
  value: RateValue | null;
  onChange: (rate: RateValue) => void;
  onCustom: () => void;
  customActive: boolean;
}) {
  return (
    <div className="space-y-1">
      <RadioGroup
        aria-label={RATE_TITLE}
        value={customActive || value === null ? "" : value}
        onValueChange={(next) => onChange(next as RateValue)}
        className="grid-cols-3 items-stretch gap-1 rounded-xl border border-input bg-field p-1"
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg px-1 py-1.5 text-xs text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              "data-[state=checked]:bg-primary/15 data-[state=checked]:text-link",
            )}
          >
            <span className="text-sm font-medium">{option.title}</span>
            <span>{option.rate}</span>
            <span className="whitespace-nowrap text-[11px]">{option.withdrawal}</span>
          </RadioGroupPrimitive.Item>
        ))}
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
