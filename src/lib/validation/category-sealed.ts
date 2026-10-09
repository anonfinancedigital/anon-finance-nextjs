import { z } from "zod";
import { isCategoryColor } from "@/lib/domain/color";
import { ciphertextSchema } from "./ciphertext";

/** Most subcategories a category may carry in one save (SIGILO-10). */
export const MAX_SUBCATEGORIES = 30;

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
  nameCt: ciphertextSchema,
});

const item = z.object({
  id: z.uuid({ error: "Identificador inválido" }).optional(),
  clientId: z.uuid({ error: "Identificador inválido" }),
  color,
  isInvestment: z.boolean({ error: "Informe se é investimento" }),
  nameCt: ciphertextSchema,
  percentChange: z
    .object({ fromMonth: z.string({ error: "Mês inválido" }), percentCt: ciphertextSchema })
    .optional(),
  subcategories: z
    .array(subcategory, { error: "Subcategorias inválidas" })
    .max(MAX_SUBCATEGORIES, `No máximo ${MAX_SUBCATEGORIES} subcategorias por categoria`),
});

/**
 * Structure of a sealed category set (`CategorySetDto["items"]`): ids, color 1..8, at most 30
 * subcategories per category and ciphertext format. Names and percentages are opaque to the
 * server; the sum and the uniqueness rules are checked in the browser before sealing.
 */
export const sealedCategorySetSchema = z.array(item, { error: "Categorias inválidas" });
