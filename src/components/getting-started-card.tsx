import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { NewTransactionButton } from "@/components/new-transaction-button";
import { Button } from "@/components/ui/button";
import type { Setup, StepId } from "@/lib/domain/onboarding";

type Props = {
  setup: Setup;
  categories: React.ComponentProps<typeof NewTransactionButton>["categories"];
  defaultDate: string;
};

const LINK_ACTIONS: Record<Exclude<StepId, "transaction">, { href: string; label: string }> = {
  categories: { href: "/categorias", label: "Definir categorias" },
  goal: { href: "/liberdade", label: "Definir meta" },
};

/** "Comece por aqui": the three setup steps, progress, and one filled button on the current step. */
export function GettingStartedCard({ setup, categories, defaultDate }: Props) {
  if (setup.complete) return null;
  const total = setup.steps.length;
  const progressText = `${setup.doneCount} de ${total} passos`;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
      <header className="space-y-2">
        <h2 className="font-display text-base font-semibold md:text-lg">Comece por aqui</h2>
        <p className="text-sm text-muted-foreground">{progressText}</p>
        <div
          role="progressbar"
          aria-label={progressText}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={setup.doneCount}
          className="h-1 w-full overflow-hidden rounded-full bg-subtle"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(setup.doneCount / total) * 100}%` }}
          />
        </div>
      </header>
      <ol className="space-y-3">
        {setup.steps.map((step) => (
          <li key={step.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={
                  step.done
                    ? "flex size-6 items-center justify-center rounded-full bg-income/15 text-income"
                    : "size-6 rounded-full border border-border"
                }
              >
                {step.done && <CheckIcon className="size-4" />}
              </span>
              <span className={step.done ? "text-muted-foreground" : "font-medium"}>{step.label}</span>
              {step.done && <span className="sr-only">concluído</span>}
            </span>
            {step.id === setup.currentId &&
              (step.id === "transaction" ? (
                <NewTransactionButton variant="inline" categories={categories} defaultDate={defaultDate} />
              ) : (
                <Button asChild>
                  <Link href={LINK_ACTIONS[step.id].href}>{LINK_ACTIONS[step.id].label}</Link>
                </Button>
              ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
