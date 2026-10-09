import { decryptField } from "@/lib/crypto/aead";
import { centsCodec, dateCodec, intCodec, microCodec, openNullable, textCodec } from "@/lib/crypto/fields";
import type { Occurrence } from "@/lib/db/repos/transactions";
import type { Category } from "@/lib/domain/budget";
import type { Goal } from "@/lib/domain/freedom";
import { currentMonth, type YearMonth } from "@/lib/domain/month";
import { monthStartOf, resolvePercent } from "@/lib/domain/percent-history";
import { fieldAad, goalColumns, type GoalValues } from "./seal";
import type { Ct, GoalDto, MonthPayload } from "./types";

const minMonth = (a: YearMonth, b: YearMonth): YearMonth =>
  a.year !== b.year ? (a.year < b.year ? a : b) : a.month <= b.month ? a : b;

/**
 * Opens the month's sealed rows into the types the UI uses. Each category gets the percent in force
 * in `month` (months after the current one use the current month's versions); none in force means
 * `percentMicro` 0 and `hasPercent` false. Any field that fails to open rejects the whole call with
 * `DecryptError`, so no partial data comes out (SIGILO-06).
 */
export async function openMonth(
  dek: CryptoKey,
  userId: string,
  payload: MonthPayload,
  month: YearMonth,
  now: Date,
): Promise<{ categories: Category[]; occurrences: Occurrence[] }> {
  const resolveAt = monthStartOf(minMonth(month, currentMonth(now)));
  const open = (ct: Ct, aadText: string) => decryptField(dek, ct, aadText);

  const categories = Promise.all(
    payload.categories.map(async (c): Promise<Category> => {
      const [name, versions, subcategories] = await Promise.all([
        open(c.nameCt, fieldAad.categoryName(userId, c.id)).then(textCodec.decode),
        Promise.all(
          c.versions.map(async (v) => ({
            fromMonth: v.fromMonth,
            percentMicro: microCodec.decode(await open(v.percentCt, fieldAad.percent(userId, c.id, v.fromMonth))),
          })),
        ),
        Promise.all(
          c.subcategories.map(async (s) => ({
            id: s.id,
            name: textCodec.decode(await open(s.nameCt, fieldAad.subcategoryName(userId, s.id))),
          })),
        ),
      ]);
      const percent = resolvePercent(versions, resolveAt);
      return {
        id: c.id,
        name,
        color: c.color,
        isInvestment: c.isInvestment,
        deleted: c.deleted,
        percentMicro: percent ?? 0,
        hasPercent: percent !== null,
        subcategories,
      };
    }),
  );

  const occurrences = Promise.all(
    payload.occurrences.map(async ({ amountCt, descriptionCt, ...o }): Promise<Occurrence> => {
      const [amount, description] = await Promise.all([
        open(amountCt, fieldAad.amount(userId, o.id)),
        openNullable(descriptionCt, (ct) => open(ct, fieldAad.description(userId, o.id))),
      ]);
      return {
        ...o,
        amountCents: centsCodec.decode(amount),
        description: description === null ? null : textCodec.decode(description),
      };
    }),
  );

  const [openedCategories, openedOccurrences] = await Promise.all([categories, occurrences]);
  return { categories: openedCategories, occurrences: openedOccurrences };
}

/** Opens the sealed goal; `birthDate` comes from `openBirthDate`. */
export async function openGoal(dek: CryptoKey, userId: string, dto: GoalDto, birthDate: string): Promise<Goal> {
  const open = async (field: keyof GoalValues, ct: Ct, decode: (text: string) => number) =>
    decode(await decryptField(dek, ct, fieldAad.goal(userId, goalColumns[field])));
  const [monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp] = await Promise.all([
    open("monthlyIncomeCents", dto.monthlyIncomeCt, centsCodec.decode),
    open("savedCents", dto.savedCt, centsCodec.decode),
    open("retirementAge", dto.retirementAgeCt, intCodec.decode),
    open("annualRateBp", dto.annualRateCt, intCodec.decode),
    open("withdrawalRateBp", dto.withdrawalRateCt, intCodec.decode),
  ]);
  return { monthlyIncomeCents, savedCents, birthDate, retirementAge, annualRateBp, withdrawalRateBp };
}

/** Opens the sealed birth date (AAAA-MM-DD); `null` stays `null`. */
export function openBirthDate(dek: CryptoKey, userId: string, ct: Ct | null): Promise<string | null> {
  return openNullable(ct, async (value) => dateCodec.decode(await decryptField(dek, value, fieldAad.birthDate(userId))));
}
