import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

/** `Input` with a fixed `R$` on the left; the value stays the typed text, without the prefix. */
function CurrencyInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-muted-foreground md:text-sm"
      >
        R$
      </span>
      <Input className={cn("pl-10", className)} {...props} />
    </div>
  );
}

export { CurrencyInput };
