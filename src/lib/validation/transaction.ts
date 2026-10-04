import { z } from "zod";
import { parseBRL } from "@/lib/domain/money";
import { isValidCalendarDate } from "@/lib/domain/month";

const amount = z.string({ error: "Informe o valor" }).transform((input, ctx) => {
  const result = parseBRL(input);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.value;
});

const date = z
  .string({ error: "Informe a data" })
  .min(1, "Informe a data")
  .refine(isValidCalendarDate, "Data inválida");

const description = z
  .string()
  .trim()
  .max(120, "A descrição deve ter no máximo 120 caracteres")
  .optional()
  .transform((value) => value || null);

const common = {
  id: z.uuid({ error: "Identificador inválido" }),
  amount,
  date,
  description,
};

/** Input of create/update transaction actions; `amount` is pt-BR text, output has `amountCents`. */
export const transactionSchema = z
  .discriminatedUnion("kind", [
    z.object({
      ...common,
      kind: z.literal("expense"),
      categoryId: z.uuid({ error: "Selecione uma categoria" }),
    }),
    z.object({
      ...common,
      kind: z.literal("income"),
      categoryId: z.undefined({ error: "Ganho não tem categoria" }).optional(),
    }),
  ])
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export type TransactionInput = z.output<typeof transactionSchema>;
