import { z } from "zod";
import { parseBRL } from "@/lib/domain/money";
import { isValidCalendarDate } from "@/lib/domain/month";
import { monthKey } from "@/lib/domain/recurrence";

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
  .string({ error: "Informe a descrição" })
  .trim()
  .min(1, "Informe a descrição")
  .max(120, "A descrição deve ter no máximo 120 caracteres");

/** AAAA-MM between 2000-01 and 2100-12. */
const isValidMonth = (key: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(key) && key >= "2000-01" && key <= "2100-12";

const common = {
  id: z.uuid({ error: "Identificador inválido" }),
  amount,
  date,
  description,
  recurrence: z.enum(["none", "forever", "until"]).default("none"),
  /** AAAA-MM, only read when `recurrence` is "until". */
  recurrenceEnd: z.string().optional(),
};

/**
 * Input of create/update transaction actions; `amount` is pt-BR text, output has `amountCents`.
 * `recurrence` defaults to "none"; output has `recurrenceEndMonth` instead of `recurrenceEnd`.
 */
export const transactionSchema = z
  .discriminatedUnion("kind", [
    z.object({
      ...common,
      kind: z.literal("expense"),
      categoryId: z.uuid({ error: "Selecione uma categoria" }),
      // The form sends "" for "Sem subcategoria".
      subcategoryId: z
        .uuid({ error: "Subcategoria inválida" })
        .optional()
        .or(z.literal("").transform(() => undefined)),
    }),
    z.object({
      ...common,
      kind: z.literal("income"),
      categoryId: z.undefined({ error: "Ganho não tem categoria" }).optional(),
      subcategoryId: z.undefined({ error: "Ganho não tem subcategoria" }).optional(),
    }),
  ])
  .superRefine(({ recurrence, recurrenceEnd, date }, ctx) => {
    if (recurrence !== "until") return;
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", path: ["recurrenceEnd"], message });
    if (!recurrenceEnd) return issue("Informe o mês final");
    if (!isValidMonth(recurrenceEnd)) return issue("Mês final inválido");
    if (recurrenceEnd < monthKey(date)) {
      issue("O mês final deve ser igual ou posterior ao mês do lançamento");
    }
  })
  .transform(({ amount, recurrenceEnd, ...rest }) => ({
    ...rest,
    amountCents: amount,
    /** AAAA-MM; null unless `recurrence` is "until". */
    recurrenceEndMonth: rest.recurrence === "until" ? recurrenceEnd! : null,
  }));

export type TransactionInput = z.output<typeof transactionSchema>;
