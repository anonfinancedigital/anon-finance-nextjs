"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { defaultAdjustIndex, TOTAL_MICRO } from "@/lib/domain/percent";
import { sumWarning } from "@/lib/domain/sum-warning";

export type AdjustOption = {
  /** Index of the category row. */
  index: number;
  label: string;
  /** Valid percentage of the row in micro-percent, or null. */
  micro: number | null;
};

/** Warning for a sum that is not 100%, with a category select and "Aplicar" to close the gap. */
export function AdjustSumBar({
  sumMicro,
  incomeCents,
  options,
  onApply,
  error,
}: {
  sumMicro: number;
  incomeCents: number | null;
  options: AdjustOption[];
  onApply: (index: number) => void;
  error: string | null;
}) {
  const selectId = useId();
  const [choice, setChoice] = useState<number | null>(null);

  // A choice for a row that no longer exists falls back to the largest valid percentage (the first row when none is valid).
  const fallback = options[defaultAdjustIndex(options.map((o) => o.micro)) ?? 0]?.index ?? null;
  const selected = options.some((o) => o.index === choice) ? choice : fallback;

  return (
    <div className="space-y-2">
      <p className="text-sm text-destructive">{sumWarning(sumMicro, incomeCents)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={selectId} className="text-sm">
          {sumMicro > TOTAL_MICRO ? "Descontar a diferença em" : "Acrescentar a diferença em"}
        </Label>
        <div className="w-56">
          <SelectField
            id={selectId}
            value={selected === null ? "" : String(selected)}
            onValueChange={(v) => setChoice(v === "" ? null : Number(v))}
            options={options.map((o) => ({ value: String(o.index), label: o.label }))}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={selected === null}
          onClick={() => selected !== null && onApply(selected)}
        >
          Aplicar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
