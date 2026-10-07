import { AlertCircleIcon } from "lucide-react";
import { sumWarning } from "@/lib/domain/sum-warning";

/** Warning for a sum that is not 100%: an alert icon followed by the text, so it does not rely on color alone. */
export function SumWarning({ sumMicro, incomeCents }: { sumMicro: number; incomeCents: number | null }) {
  return (
    <p className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircleIcon aria-hidden="true" className="size-4 shrink-0" />
      {sumWarning(sumMicro, incomeCents)}
    </p>
  );
}
