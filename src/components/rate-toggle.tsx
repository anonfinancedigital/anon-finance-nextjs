"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { RadioGroup } from "@/components/ui/radio-group";
import { RATE_TITLE } from "@/lib/domain/freedom-copy";
import { cn } from "cn";

export type RateValue = "6" | "8" | "10";

const options = [
  { value: "6", label: "Conservador · 6%" },
  { value: "8", label: "Moderado · 8%" },
  { value: "10", label: "Agressivo · 10%" },
] as const;

/** Full-width segmented control for the expected real return (radiogroup named by RATE_TITLE). */
export function RateToggle({ value, onChange }: { value: RateValue; onChange: (rate: RateValue) => void }) {
  return (
    <RadioGroup
      aria-label={RATE_TITLE}
      value={value}
      onValueChange={(next) => onChange(next as RateValue)}
      className="grid-cols-3 gap-1 rounded-xl border border-input bg-field p-1"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "min-h-9 cursor-pointer rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "data-[state=checked]:bg-primary/15 data-[state=checked]:text-link",
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroup>
  );
}
