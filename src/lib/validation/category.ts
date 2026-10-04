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

const item = z
  .object({
    id: z.uuid({ error: "Identificador inválido" }).optional(),
    name: z.string({ error: "Informe o nome da categoria" }).trim(),
    percent,
    color,
  })
  .transform(({ percent, ...rest }) => ({ ...rest, percentBp: percent }));

/** Whole category set: items parsed first, then the set rules (sum = 100%, unique names). */
export const categorySetSchema = z.array(item).superRefine((items, ctx) => {
  const result = validateCategorySet(items.map((i) => ({ name: i.name, bp: i.percentBp })));
  if (result.ok) return;

  for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
    const [index, field] = key.split(".");
    ctx.addIssue({ code: "custom", path: [Number(index), field], message });
  }
  ctx.addIssue({ code: "custom", path: [], message: result.error });
});

export type CategorySetInput = z.output<typeof categorySetSchema>;
