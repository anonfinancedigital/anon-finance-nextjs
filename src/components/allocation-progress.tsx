import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TONES = {
  over: { text: "text-destructive", bar: "bg-destructive" },
  under: { text: "text-warning", bar: "bg-warning" },
  exact: { text: "text-success", bar: "bg-success" },
} as const;

/**
 * "X de 100% alocado" indicator: the text above a bar; `value` is the fill in percent (0 to 100).
 * `tone` says where the sum stands: above 100% is red, below it amber (something left to distribute, not an
 * error), exactly 100% green; each has an icon so none relies on color alone.
 */
export function AllocationProgress({
  value,
  text,
  tone,
}: {
  value: number;
  text: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="space-y-1.5">
      <p className={`flex items-center gap-1.5 text-sm ${TONES[tone].text}`}>
        {tone === "exact" && <CheckCircle2Icon aria-hidden className="size-4 shrink-0" />}
        {tone !== "exact" && <AlertCircleIcon aria-hidden className="size-4 shrink-0" />}
        {text}
      </p>
      <Progress value={value} aria-label={text} indicatorClassName={TONES[tone].bar} />
    </div>
  );
}
