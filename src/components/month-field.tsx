"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/select-field";
import { monthNamesPtBR } from "@/lib/domain/month";
import { parseMonthKey } from "@/lib/domain/recurrence-plan";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A month (AAAA-MM) picked as a month name and a year, the same on every browser: `<input type="month">`
 * is a plain text box on desktop Firefox and Safari. `onChange` gets "" until both are chosen.
 */
export function MonthField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: {
  /** Id of the month select, so a `<Label htmlFor>` points at it. */
  id: string;
  /** Accessible name of the pair, e.g. "Mês inicial". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const parsed = parseMonthKey(value);
  // One half chosen, the other not yet: kept here, since the parent only holds a complete month.
  const [partial, setPartial] = useState({ month: "", year: "" });
  const month = parsed ? pad(parsed.month) : partial.month;
  const year = parsed ? String(parsed.year) : partial.year;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 33 }, (_, i) => String(thisYear - 2 + i));
  if (year && !years.includes(year)) years.push(year);
  years.sort();

  function change(next: { month: string; year: string }) {
    setPartial(next);
    onChange(next.month && next.year ? `${next.year}-${next.month}` : "");
  }

  return (
    <div role="group" aria-label={label} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
      <SelectField
        id={id}
        ariaLabel={`${label}: mês`}
        value={month}
        placeholder="Mês"
        disabled={disabled}
        invalid={invalid}
        onValueChange={(next) => change({ month: next, year })}
        options={[{ value: "", label: "Mês" }, ...monthNamesPtBR().map((name, i) => ({ value: pad(i + 1), label: name }))]}
      />
      <SelectField
        ariaLabel={`${label}: ano`}
        value={year}
        placeholder="Ano"
        disabled={disabled}
        invalid={invalid}
        onValueChange={(next) => change({ month, year: next })}
        options={[{ value: "", label: "Ano" }, ...years.map((y) => ({ value: y, label: y }))]}
      />
    </div>
  );
}
