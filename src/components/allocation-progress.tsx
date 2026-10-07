import { Progress } from "@/components/ui/progress";

/** Neutral "X de 100% alocado" indicator: the text above a bar; `value` is the fill in percent (0 to 100). */
export function AllocationProgress({ value, text }: { value: number; text: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Progress value={value} aria-label={text} indicatorClassName="bg-muted-foreground" />
    </div>
  );
}
