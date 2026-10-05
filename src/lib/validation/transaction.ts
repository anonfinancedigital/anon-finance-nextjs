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
  /** AAAA-MM first month of the series, only read when `recurrence` is "until". */
  recurrenceStart: z.string().optional(),
};

/**
 * Input of create/update transaction actions; `amount` is pt-BR text, output has `amountCents`.
 * `recurrence` defaults to "none"; output has `recurrenceStartMonth` and `recurrenceEndMonth`
 * instead of `recurrenceStart` and `recurrenceEnd`.
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
  .superRefine(({ recurrence, recurrenceStart, recurrenceEnd }, ctx) => {
    if (recurrence !== "until") return;
    const issue = (field: "recurrenceStart" | "recurrenceEnd", message: string) =>
      ctx.addIssue({ code: "custom", path: [field], message });
    let startOk = true;
    if (!recurrenceStart) {
      issue("recurrenceStart", "Informe o mês inicial");
      startOk = false;
    } else if (!isValidMonth(recurrenceStart)) {
      issue("recurrenceStart", "Mês inicial inválido");
      startOk = false;
    }
    if (!recurrenceEnd) return issue("recurrenceEnd", "Informe o mês final");
    if (!isValidMonth(recurrenceEnd)) return issue("recurrenceEnd", "Mês final inválido");
    if (startOk && recurrenceEnd < recurrenceStart!) {
      issue("recurrenceEnd", "O mês final deve ser igual ou posterior ao mês inicial");
    }
  })
  .transform(({ amount, recurrenceStart, recurrenceEnd, ...rest }) => ({
    ...rest,
    amountCents: amount,
    /** AAAA-MM; null unless `recurrence` is "until". */
    recurrenceStartMonth: rest.recurrence === "until" ? recurrenceStart! : null,
    /** AAAA-MM; null unless `recurrence` is "until". */
    recurrenceEndMonth: rest.recurrence === "until" ? recurrenceEnd! : null,
  }));

export type TransactionInput = z.output<typeof transactionSchema>;
