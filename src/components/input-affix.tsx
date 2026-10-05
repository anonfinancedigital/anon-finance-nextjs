import { cloneElement, type ReactElement } from "react";
import { cn } from "cn";

/** Wraps a single `Input` with a fixed symbol inside the field: `prefix` on the left ("R$") or `suffix` on the right ("%"). */
export function InputAffix({
  prefix,
  suffix,
  children,
}: {
  prefix?: string;
  suffix?: string;
  children: ReactElement<{ className?: string }>;
}) {
  const symbol = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground";
  return (
    <div className="relative">
      {prefix && (
        <span aria-hidden="true" className={cn(symbol, "left-3.5")}>
          {prefix}
        </span>
      )}
      {cloneElement(children, {
        className: cn(prefix && "pl-9", suffix && "pr-8", children.props.className),
      })}
      {suffix && (
        <span aria-hidden="true" className={cn(symbol, "right-3.5")}>
          {suffix}
        </span>
      )}
    </div>
  );
}
