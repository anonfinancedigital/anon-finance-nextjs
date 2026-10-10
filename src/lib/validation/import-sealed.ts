import { z } from "zod";
import { isCategoryColor } from "@/lib/domain/color";
import { isValidCalendarDate } from "@/lib/domain/month";
import { MAX_SUBCATEGORIES } from "@/lib/validation/category-sealed";
import { ciphertextSchema, nullableCiphertextSchema } from "./ciphertext";

export const MAX_IMPORT_TRANSACTIONS = 15_000;
export const MAX_IMPORT_CATEGORIES = 1_000;
export const MAX_IMPORT_VERSIONS = 100;

const uuid = z.uuid({ error: "Identificador inválido" });
const day = z.string().refine(isValidCalendarDate, "Data inválida");
// "0001-01-01" means "since ever"; `isValidCalendarDate` maps years 0-99 to 19xx, so it is matched literally.
const month = z
  .string()
  .refine((iso) => iso === "0001-01-01" || (isValidCalendarDate(iso) && iso.endsWith("-01")), "Mês inválido");

const transaction = z.object({
  id: uuid,
  kind: z.enum(["income", "expense"]),
  date: day,
  categoryId: uuid.nullable(),
  subcategoryId: uuid.nullable(),
  amountCt: ciphertextSchema,
  descriptionCt: nullableCiphertextSchema,
  recurring: z.boolean(),
  recurrenceDay: z.number().int().min(1).max(31).nullable(),
  recurrenceEnd: day.nullable(),
  seriesId: uuid.nullable(),
});

const category = z.object({
  id: uuid,
  color: z.number().refine(isCategoryColor, "Cor inválida"),
  isInvestment: z.boolean(),
  deletedFrom: day.nullable(),
  nameCt: ciphertextSchema,
  versions: z.array(z.object({ fromMonth: month, percentCt: ciphertextSchema })).max(MAX_IMPORT_VERSIONS),
  subcategories: z.array(z.object({ id: uuid, nameCt: ciphertextSchema })).max(MAX_SUBCATEGORIES),
});

const goal = z.object({
  monthlyIncomeCt: ciphertextSchema,
  savedCt: ciphertextSchema,
  retirementAgeCt: ciphertextSchema,
  annualRateCt: ciphertextSchema,
  withdrawalRateCt: ciphertextSchema,
});

const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;

/**
 * Structure of a sealed import (`ImportPayload`): ids, dates, color 1..8, ciphertext format, the
 * expense/income and recurrence rules of the table, references between rows of the payload and the
 * quantity limits. Names, amounts and the goal are opaque to the server; their rules live in the browser.
 */
export const sealedImportSchema = z
  .object({
    categories: z.array(category).max(MAX_IMPORT_CATEGORIES),
    transactions: z.array(transaction).max(MAX_IMPORT_TRANSACTIONS),
    goal: goal.nullable(),
    birthDateCt: nullableCiphertextSchema,
  })
  .superRefine(({ categories, transactions }, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const subcategoryIds = categories.flatMap((c) => c.subcategories.map((s) => s.id));
    if (hasDuplicates(transactions.map((t) => t.id))) return fail("Identificadores repetidos");
    if (hasDuplicates(categories.map((c) => c.id)) || hasDuplicates(subcategoryIds)) {
      return fail("Identificadores repetidos");
    }
    if (categories.some((c) => hasDuplicates(c.versions.map((v) => v.fromMonth)))) return fail("Vigências repetidas");

    const categoryIds = new Set(categories.map((c) => c.id));
    const subcategoryOwner = new Map(categories.flatMap((c) => c.subcategories.map((s) => [s.id, c.id] as const)));
    for (const t of transactions) {
      if (t.kind === "income") {
        if (t.categoryId !== null || t.subcategoryId !== null) return fail("Ganho não tem categoria nem subcategoria");
      } else {
        if (t.categoryId === null || !categoryIds.has(t.categoryId)) return fail("Categoria inválida");
        if (t.subcategoryId !== null && subcategoryOwner.get(t.subcategoryId) !== t.categoryId) {
          return fail("Subcategoria inválida");
        }
      }
      if (t.recurring !== (t.recurrenceDay !== null) || t.recurring !== (t.seriesId !== null)) {
        return fail("Recorrência inválida");
      }
      if (t.recurrenceEnd !== null && (!t.recurring || t.recurrenceEnd < `${t.date.slice(0, 7)}-01`)) {
        return fail("Recorrência inválida");
      }
    }
  });
