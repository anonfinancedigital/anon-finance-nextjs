import { z } from "zod";
import { isValidCalendarDate } from "@/lib/domain/month";
import { ciphertextSchema, nullableCiphertextSchema } from "./ciphertext";

/** AAAA-MM between 2000-01 and 2100-12. */
const isValidMonth = (key: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(key) && key >= "2000-01" && key <= "2100-12";

const common = {
  id: z.uuid({ error: "Identificador inválido" }),
  date: z
    .string({ error: "Informe a data" })
    .min(1, "Informe a data")
    .refine(isValidCalendarDate, "Data inválida"),
  amountCt: ciphertextSchema,
  descriptionCt: nullableCiphertextSchema,
  recurrence: z.enum(["none", "indefinite", "until"], { error: "Recorrência inválida" }),
  recurrenceStartMonth: z.string().optional(),
  recurrenceEndMonth: z.string().optional(),
};

/**
 * Structure of a sealed transaction (`TransactionDto`): ids, kind, date, category rules, recurrence
 * and ciphertext format. Amount and description are opaque; their rules live in the browser.
 * Recurrence months are only read, and kept, when `recurrence` is "until".
 */
export const sealedTransactionSchema = z
  .discriminatedUnion("kind", [
    z.object({
      ...common,
      kind: z.literal("expense"),
      categoryId: z.uuid({ error: "Selecione uma categoria" }),
      subcategoryId: z.uuid({ error: "Subcategoria inválida" }).nullable(),
    }),
    z.object({
      ...common,
      kind: z.literal("income"),
      categoryId: z.null({ error: "Ganho não tem categoria" }),
      subcategoryId: z.null({ error: "Ganho não tem subcategoria" }),
    }),
  ])
  .superRefine(({ recurrence, recurrenceStartMonth: start, recurrenceEndMonth: end }, ctx) => {
    if (recurrence !== "until") return;
    const issue = (field: "recurrenceStartMonth" | "recurrenceEndMonth", message: string) =>
      ctx.addIssue({ code: "custom", path: [field], message });
    let startOk = true;
    if (!start) {
      issue("recurrenceStartMonth", "Informe o mês inicial");
      startOk = false;
    } else if (!isValidMonth(start)) {
      issue("recurrenceStartMonth", "Mês inicial inválido");
      startOk = false;
    }
    if (!end) return issue("recurrenceEndMonth", "Informe o mês final");
    if (!isValidMonth(end)) return issue("recurrenceEndMonth", "Mês final inválido");
    if (startOk && end < start!) {
      issue("recurrenceEndMonth", "O mês final deve ser igual ou posterior ao mês inicial");
    }
  })
  .transform((dto) =>
    dto.recurrence === "until"
      ? dto
      : { ...dto, recurrenceStartMonth: undefined, recurrenceEndMonth: undefined },
  );

/** The extra fields of an edit (`UpdateTransactionDto`): the new series segment's id and ciphertext. */
export const sealedTransactionUpdateExtraSchema = z.object({
  newRowId: z.uuid({ error: "Identificador inválido" }),
  insertedCt: z.object({
    amountCt: ciphertextSchema,
    descriptionCt: nullableCiphertextSchema,
  }),
});
