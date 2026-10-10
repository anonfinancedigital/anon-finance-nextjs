import { encryptField } from "@/lib/crypto/aead";
import { microCodec, sealNullable, textCodec } from "@/lib/crypto/fields";
import { ageOn } from "@/lib/domain/freedom";
import { birthDateGoalConflict, today } from "@/lib/validation/birth-date";
import type { OpenedExport } from "./export";
import { IMPORT_INVALID } from "./import-file";
import { fieldAad, sealBirthDate, sealGoal, sealTransaction } from "./seal";
import type { ImportPayload } from "./types";

/** Largest request body a Server Action accepts is 8 MB (`next.config.ts`); this leaves room for the envelope. */
export const MAX_IMPORT_BODY_CHARS = 7_000_000;

/** The sealed payload is too big for one request; the message is the one of an invalid file (IMPORT-13). */
export class ImportTooLargeError extends Error {
  constructor() {
    super(IMPORT_INVALID);
    this.name = "ImportTooLargeError";
  }
}

export type BuildImportInput = {
  data: OpenedExport;
  userId: string;
  dek: CryptoKey;
  /** Birth date of the destination account (AAAA-MM-DD), `null` when it has none. */
  accountBirthDate: string | null;
  now: Date;
  newId?: () => string;
  maxBodyChars?: number;
};

/**
 * Seals the opened file for the destination account (IMPORT-03): new ids (IMPORT-06), every field
 * under the AAD of its new row, and the goal dropped when the account's age (or the file's, when the
 * account has no birth date) already reaches its retirement age (IMPORT-22). Rejects with
 * `ImportTooLargeError` above `maxBodyChars` and with the crypto error if any field cannot be sealed.
 */
export async function buildImportPayload(
  input: BuildImportInput,
): Promise<{ payload: ImportPayload; goalSkipped: boolean }> {
  const { data, userId, dek, accountBirthDate, now } = input;
  const newId = input.newId ?? (() => crypto.randomUUID());
  const maxBodyChars = input.maxBodyChars ?? MAX_IMPORT_BODY_CHARS;
  const sealText = (text: string, aadText: string) => encryptField(dek, textCodec.encode(text), aadText);

  const categoryIds = new Map(data.categories.map((c) => [c.id, newId()]));
  const subcategoryIds = new Map(data.categories.flatMap((c) => c.subcategories.map((s) => [s.id, newId()] as const)));
  const transactionIds = new Map(data.transactions.map((t) => [t.id, newId()]));
  // A series is identified by its first segment (`transactionsRepo`): keep that when the segment is in the file.
  const seriesIds = new Map<string, string>();
  for (const t of data.transactions) {
    if (t.seriesId !== null && !seriesIds.has(t.seriesId)) seriesIds.set(t.seriesId, transactionIds.get(t.seriesId) ?? newId());
  }

  const effectiveBirthDate = accountBirthDate ?? data.birthDate;
  const goalConflicts =
    data.goal !== null &&
    effectiveBirthDate !== null &&
    birthDateGoalConflict(ageOn(effectiveBirthDate, today(now)), data.goal.retirementAge) !== null;

  const [transactions, categories, goal, birthDateCt] = await Promise.all([
    Promise.all(
      data.transactions.map(async (t) => {
        const id = transactionIds.get(t.id)!;
        return {
          id,
          kind: t.kind,
          date: t.date,
          categoryId: t.categoryId === null ? null : categoryIds.get(t.categoryId)!,
          subcategoryId: t.subcategoryId === null ? null : subcategoryIds.get(t.subcategoryId)!,
          ...(await sealTransaction(dek, userId, id, t)),
          recurring: t.recurring,
          recurrenceDay: t.recurrenceDay,
          recurrenceEnd: t.recurrenceEnd,
          seriesId: t.seriesId === null ? null : seriesIds.get(t.seriesId)!,
        };
      }),
    ),
    Promise.all(
      data.categories.map(async (c) => {
        const id = categoryIds.get(c.id)!;
        const [nameCt, versions, subcategories] = await Promise.all([
          sealText(c.name, fieldAad.categoryName(userId, id)),
          Promise.all(
            c.percentVersions.map(async (v) => ({
              fromMonth: v.fromMonth,
              percentCt: await encryptField(dek, microCodec.encode(v.percentMicro), fieldAad.percent(userId, id, v.fromMonth)),
            })),
          ),
          Promise.all(
            c.subcategories.map(async (s) => {
              const subId = subcategoryIds.get(s.id)!;
              return { id: subId, nameCt: await sealText(s.name, fieldAad.subcategoryName(userId, subId)) };
            }),
          ),
        ]);
        return { id, color: c.color, isInvestment: c.isInvestment, deletedFrom: c.deletedFrom, nameCt, versions, subcategories };
      }),
    ),
    data.goal === null || goalConflicts ? null : sealGoal(dek, userId, data.goal),
    sealNullable(data.birthDate, (iso) => sealBirthDate(dek, userId, iso)),
  ]);

  const payload: ImportPayload = { categories, transactions, goal, birthDateCt };
  if (JSON.stringify(payload).length > maxBodyChars) throw new ImportTooLargeError();
  return { payload, goalSkipped: data.goal !== null && goalConflicts };
}
