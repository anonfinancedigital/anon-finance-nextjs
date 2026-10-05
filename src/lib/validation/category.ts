import { z } from "zod";
import { validateCategorySet } from "@/lib/domain/budget";
import { isCategoryColor } from "@/lib/domain/color";
import { parsePercent } from "@/lib/domain/percent";

const percent = z.string({ error: "Informe o percentual" }).transform((input, ctx) => {
  const result = parsePercent(input);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.value;
});

// Optional input key so callers type-check without it; a missing color is rejected like any other.
const color = z
  .unknown()
  .optional()
  .transform((input, ctx) => {
    if (!isCategoryColor(input)) {
      ctx.addIssue({ code: "custom", message: "Cor inválida" });
      return z.NEVER;
    }
    return input;
  });

const subcategory = z.object({
  id: z.uuid({ error: "Identificador inválido" }).optional(),
  name: z.string({ error: "Informe o nome da subcategoria" }).trim(),
});

const item = z
  .object({
    id: z.uuid({ error: "Identificador inválido" }).optional(),
    name: z.string({ error: "Informe o nome da categoria" }).trim(),
    percent,
    color,
    isInvestment: z.boolean().default(false),
    subcategories: z.array(subcategory).default([]),
  })
  .transform(({ percent, ...rest }) => ({ ...rest, percentMicro: percent }));

/** Whole category set: items parsed first, then the set rules (sum = 100%, unique names, subcategory names). */
export const categorySetSchema = z.array(item).superRefine((items, ctx) => {
  // An item that failed its own parsing was not transformed (no percentMicro): its issues are
  // already reported, so the set rules would only add noise (e.g. "soma NaN%").
  if (items.some((i) => typeof i.percentMicro !== "number")) return;
  const result = validateCategorySet(
    items.map((i) => ({ name: i.name, micro: i.percentMicro, subcategories: i.subcategories })),
  );
  if (result.ok) return;

  for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
    // "0.subcategories.2.name" → [0, "subcategories", 2, "name"]
    const path = key.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
    ctx.addIssue({ code: "custom", path, message });
  }
  ctx.addIssue({ code: "custom", path: [], message: result.error });
});

export type CategorySetInput = z.output<typeof categorySetSchema>;
