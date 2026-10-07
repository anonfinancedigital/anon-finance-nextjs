"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GoalSummary } from "@/lib/domain/freedom";
import { ADJUST_LABEL, assumptionChips, withdrawalTooltip } from "@/lib/domain/freedom-copy";

const CHIP_CLASS = "inline-flex items-center gap-1.5 rounded-full border border-border bg-subtle px-3 py-1 text-xs";
const FOCUS_CLASS = "outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const TODAY_TOOLTIP = "Todos os valores já descontam a inflação.";

/**
 * Premises behind the result as chips: scenario, real rate, withdrawal rate (with an info tooltip)
 * and "values in today's R$" (with a tooltip), plus the "Ajustar" link. Tooltips open on hover and
 * focus; Escape closes them.
 */
export function AssumptionChips({ summary, onAdjust }: { summary: GoalSummary; onAdjust: () => void }) {
  const chips = assumptionChips(summary);
  const withdrawal = withdrawalTooltip({
    withdrawalBp: summary.withdrawalRateBp,
    targetCents: summary.targetCents,
    monthlyIncomeCents: summary.monthlyIncomeCents,
  });

  return (
    <ul aria-label="Premissas do cálculo" className="flex flex-wrap items-center gap-2">
      <li className={CHIP_CLASS}>{chips.scenario}</li>
      <li className={CHIP_CLASS}>{chips.rate}</li>
      <li className={CHIP_CLASS}>
        {chips.withdrawal}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="O que é a taxa de retirada"
              className={`inline-flex cursor-pointer rounded-full ${FOCUS_CLASS}`}
            >
              <Info aria-hidden className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{withdrawal}</TooltipContent>
        </Tooltip>
      </li>
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={`${CHIP_CLASS} cursor-help ${FOCUS_CLASS}`}>
              {chips.today}
            </button>
          </TooltipTrigger>
          <TooltipContent>{TODAY_TOOLTIP}</TooltipContent>
        </Tooltip>
      </li>
      <li>
        <button
          type="button"
          onClick={onAdjust}
          className={`cursor-pointer rounded-md text-sm text-link underline-offset-4 hover:underline ${FOCUS_CLASS}`}
        >
          Ajustar
        </button>
      </li>
    </ul>
  );
}
