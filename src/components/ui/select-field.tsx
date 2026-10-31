"use client"

import * as React from "react"
import { cn } from "cn"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Radix items cannot have an empty value, so "" (e.g. "Todas") travels as this sentinel.
const EMPTY = "__empty__"

type Option = { value: string; label: string }

/**
 * Single-choice dropdown over `{ value, label }` options, with the app's field look.
 * `value` and `onValueChange` use "" for the "nothing/all" option, like a native select.
 * Without `value` it is uncontrolled (starting at "").
 */
function SelectField({
  id,
  ariaLabel,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  invalid,
  className,
}: {
  id?: string
  /** Accessible name when there is no visible label tied to `id`. */
  ariaLabel?: string
  value?: string
  onValueChange?: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <Select
      {...(value === undefined
        ? { defaultValue: EMPTY }
        : { value: value === "" ? EMPTY : value })}
      onValueChange={(v) => onValueChange?.(v === EMPTY ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || EMPTY} value={o.value === "" ? EMPTY : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { SelectField }
