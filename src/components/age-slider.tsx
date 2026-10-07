"use client";

import { Slider } from "@/components/ui/slider";

const THUMB_PX = 16;
const DISABLED_HINT = "Informe a data de nascimento para usar o controle";

/**
 * Full-width age slider: the current value ("48 anos") floats above the handle and the limits
 * sit under its ends. Arrow keys move one year (Radix `step`). `disabled` swaps the limits for a
 * hint, since the minimum depends on the birth date.
 */
export function AgeSlider({
  value,
  min,
  max,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (age: number) => void;
  ariaLabel: string;
}) {
  const low = Math.min(min, max);
  const current = Math.min(max, Math.max(low, value));
  const fraction = max === low ? 0 : (current - low) / (max - low);

  return (
    <div className="space-y-1 px-4">
      <div className="relative h-5" aria-hidden>
        {!disabled && (
          <span
            className="absolute top-0 -translate-x-1/2 text-sm font-medium whitespace-nowrap text-link"
            style={{ left: `calc(${fraction * 100}% + ${THUMB_PX / 2 - fraction * THUMB_PX}px)` }}
          >
            {current} anos
          </span>
        )}
      </div>
      <Slider
        aria-label={ariaLabel}
        min={low}
        max={max}
        step={1}
        value={[current]}
        disabled={disabled}
        onValueChange={([age]) => onChange(age)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        {disabled ? (
          <p>{DISABLED_HINT}</p>
        ) : (
          <>
            <span>{low} anos</span>
            <span>{max} anos</span>
          </>
        )}
      </div>
    </div>
  );
}
