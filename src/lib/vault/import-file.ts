import { z } from "zod";
import { MAX_CATEGORY_NAME, MAX_SUBCATEGORIES, MAX_SUBCATEGORY_NAME } from "@/lib/domain/budget";
import { isCategoryColor } from "@/lib/domain/color";
import { MAX_AGE } from "@/lib/validation/birth-date";
import { MAX_INCOME_CENTS, MAX_RATE_BP, MIN_RATE_BP } from "@/lib/validation/goal";
import { MAX_IMPORT_CATEGORIES, MAX_IMPORT_TRANSACTIONS, MAX_IMPORT_VERSIONS } from "@/lib/validation/import-sealed";
import { MAX_CENTS } from "@/lib/domain/money";
import { isValidCalendarDate } from "@/lib/domain/month";
import type { OpenedExport } from "./export";

export const IMPORT_INVALID = "Arquivo inválido. Use o arquivo exportado pelo Orçamento.";
export const IMPORT_NOT_EMPTY = "Só é possível importar em uma conta sem transações nem categorias";
export const IMPORT_TOO_LARGE = "Arquivo muito grande (máximo 20 MB)";

export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DESCRIPTION = 120;
const MAX_PERCENT_MICRO = 100_000_000;

export type ImportSummary = { transactions: number; categories: number; subcategories: number };

export type ParsedImport =
  | { ok: true; data: OpenedExport; summary: ImportSummary }
  | { ok: false; error: string };

/** Error message for a file above 20 MB (IMPORT-08), `null` when the size is fine. */
export function checkImportFileSize(bytes: number): string | null {
  return bytes > MAX_IMPORT_FILE_BYTES ? IMPORT_TOO_LARGE : null;
}

const id = z.string().min(1).max(64);
const day = z.string().refine(isValidCalendarDate);
// "0001-01-01" means "since ever"; `isValidCalendarDate` maps years 0-99 to 19xx, so it is matched literally.
const SINCE_EVER = "0001-01-01";
const firstOfMonth = z.string().refine((iso) => iso === SINCE_EVER || (isValidCalendarDate(iso) && iso.endsWith("-01")));
const nullable = <T extends z.ZodType>(schema: T) => schema.nullable();

const transactionSchema = z.object({
  id,
  kind: z.enum(["income", "expense"]),
  date: day,
  categoryId: nullable(id),
  subcategoryId: nullable(id),
  amountCents: z.number().int().min(1).max(MAX_CENTS),
  description: nullable(z.string().min(1).max(MAX_DESCRIPTION)),
  recurring: z.boolean(),
  recurrenceDay: nullable(z.number().int().min(1).max(31)),
  recurrenceEnd: nullable(day),
  seriesId: nullable(id),
});

const categorySchema = z.object({
  id,
  name: z.string().min(1).max(MAX_CATEGORY_NAME),
  color: z.number().refine(isCategoryColor),
  isInvestment: z.boolean(),
  deletedFrom: nullable(day),
  percentVersions: z
    .array(z.object({ fromMonth: firstOfMonth, percentMicro: z.number().int().min(1).max(MAX_PERCENT_MICRO) }))
    .max(MAX_IMPORT_VERSIONS),
  subcategories: z
    .array(z.object({ id, name: z.string().min(1).max(MAX_SUBCATEGORY_NAME) }))
    .max(MAX_SUBCATEGORIES),
});

const goalSchema = z
  .object({
    monthlyIncomeCents: z.number().int().min(1).max(MAX_INCOME_CENTS),
    savedCents: z.number().int().min(0).max(MAX_CENTS),
    retirementAge: z.number().int().min(1).max(MAX_AGE),
    annualRateBp: z.number().int().min(MIN_RATE_BP).max(MAX_RATE_BP),
    withdrawalRateBp: z.number().int().min(MIN_RATE_BP).max(MAX_RATE_BP),
  })
  .refine((g) => g.withdrawalRateBp <= g.annualRateBp);

const fileSchema = z.object({
  transactions: z.array(transactionSchema).max(MAX_IMPORT_TRANSACTIONS),
  categories: z.array(categorySchema).max(MAX_IMPORT_CATEGORIES),
  goal: nullable(goalSchema),
  birthDate: nullable(day),
});

const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;

/** Rules that span rows: unique ids and names, references between rows and the recurrence fields. */
function crossChecks(data: OpenedExport): boolean {
  const { transactions, categories } = data;
  const subcategoryIds = categories.flatMap((c) => c.subcategories.map((s) => s.id));
  if (hasDuplicates(transactions.map((t) => t.id))) return false;
  if (hasDuplicates(categories.map((c) => c.id)) || hasDuplicates(subcategoryIds)) return false;
  if (categories.some((c) => hasDuplicates(c.percentVersions.map((v) => v.fromMonth)))) return false;
  if (categories.some((c) => hasDuplicates(c.subcategories.map((s) => s.name.toLowerCase())))) return false;
  const active = categories.filter((c) => c.deletedFrom === null).map((c) => c.name.toLowerCase());
  if (hasDuplicates(active)) return false;

  const subcategoryOwner = new Map(categories.flatMap((c) => c.subcategories.map((s) => [s.id, c.id] as const)));
  const categoryIds = new Set(categories.map((c) => c.id));
  return transactions.every((t) => {
    if (t.kind === "income") {
      if (t.categoryId !== null || t.subcategoryId !== null) return false;
    } else {
      if (t.categoryId === null || !categoryIds.has(t.categoryId)) return false;
      if (t.subcategoryId !== null && subcategoryOwner.get(t.subcategoryId) !== t.categoryId) return false;
    }
    if (t.recurring !== (t.recurrenceDay !== null) || t.recurring !== (t.seriesId !== null)) return false;
    if (t.recurrenceEnd !== null && (!t.recurring || t.recurrenceEnd < `${t.date.slice(0, 7)}-01`)) return false;
    return true;
  });
}

/**
 * Reads the text of an exported file (IMPORT-09 to IMPORT-13): every row must satisfy the rules the
 * app applies on save. The sum of the category percentages is not checked, the exported state is
 * authoritative (a deleted category can leave the active set short of 100%).
 */
export function parseImportFile(text: string): ParsedImport {
  const invalid = { ok: false, error: IMPORT_INVALID } as const;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return invalid;
  }
  const parsed = fileSchema.safeParse(json);
  if (!parsed.success || !crossChecks(parsed.data)) return invalid;

  const data = parsed.data;
  return {
    ok: true,
    data,
    summary: {
      transactions: data.transactions.length,
      categories: data.categories.length,
      subcategories: data.categories.reduce((sum, c) => sum + c.subcategories.length, 0),
    },
  };
}
