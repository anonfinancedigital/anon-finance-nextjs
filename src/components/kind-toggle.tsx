"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "cn";

type Kind = "income" | "expense";

const options = [
  { kind: "expense", label: "Gasto", checked: "data-[state=checked]:bg-destructive/15 data-[state=checked]:text-destructive" },
  { kind: "income", label: "Receita", checked: "data-[state=checked]:bg-success/15 data-[state=checked]:text-success" },
] as const;

/** Full-width segmented control for the transaction kind (radiogroup "Tipo"). */
export function KindToggle({ value, onChange }: { value: Kind; onChange: (kind: Kind) => void }) {
  return (
    <RadioGroup
      aria-label="Tipo"
      value={value}
      onValueChange={(next) => onChange(next as Kind)}
      className="grid-cols-2 gap-1 rounded-xl border border-input bg-field p-1"
    >
      {options.map(({ kind, label, checked }) => (
        <RadioGroupPrimitive.Item
          key={kind}
          value={kind}
          className={cn(
            "h-9 cursor-pointer rounded-lg text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            checked,
          )}
        >
          {label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroup>
  );
}
