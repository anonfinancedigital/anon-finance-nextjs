import { aad, encryptField } from "@/lib/crypto/aead";
import { centsCodec, dateCodec, intCodec, textCodec } from "@/lib/crypto/fields";
import type { Goal } from "@/lib/domain/freedom";
import type { Ct, GoalDto } from "./types";

/** AAD of every sealed field: `table.column.userId[.rowId]` (SIGILO-05). Shared by seal and open. */
export const fieldAad = {
  amount: (userId: string, rowId: string) => aad("transaction", "amount_ct", userId, rowId),
  description: (userId: string, rowId: string) => aad("transaction", "description_ct", userId, rowId),
  categoryName: (userId: string, categoryId: string) => aad("category", "name_ct", userId, categoryId),
  subcategoryName: (userId: string, subcategoryId: string) =>
    aad("subcategory", "name_ct", userId, subcategoryId),
  /** A percent version's row is the pair (category, fromMonth). */
  percent: (userId: string, categoryId: string, fromMonth: string) =>
    aad("category_percent", "percent_ct", userId, `${categoryId}.${fromMonth}`),
  goal: (userId: string, column: GoalColumn) => aad("financial_goal", column, userId),
  birthDate: (userId: string) => aad("user_vault", "birth_date_ct", userId),
};

/** Sealed column of each goal field. */
export const goalColumns = {
  monthlyIncomeCents: "monthly_income_ct",
  savedCents: "saved_ct",
  retirementAge: "retirement_age_ct",
  annualRateBp: "annual_rate_ct",
  withdrawalRateBp: "withdrawal_rate_ct",
} as const;

export type GoalColumn = (typeof goalColumns)[keyof typeof goalColumns];
export type GoalValues = Omit<Goal, "birthDate">;

/** Seals amount and description of the transaction row `rowId`; an empty description stays `null`. */
export async function sealTransaction(
  dek: CryptoKey,
  userId: string,
  rowId: string,
  tx: { amountCents: number; description: string | null },
): Promise<{ amountCt: Ct; descriptionCt: Ct | null }> {
  const description = tx.description === "" ? null : tx.description;
  const [amountCt, descriptionCt] = await Promise.all([
    encryptField(dek, centsCodec.encode(tx.amountCents), fieldAad.amount(userId, rowId)),
    description === null
      ? null
      : encryptField(dek, textCodec.encode(description), fieldAad.description(userId, rowId)),
  ]);
  return { amountCt, descriptionCt };
}

/** Seals each goal field under its own column. */
export async function sealGoal(dek: CryptoKey, userId: string, goal: GoalValues): Promise<GoalDto> {
  const seal = (field: keyof GoalValues, text: string) =>
    encryptField(dek, text, fieldAad.goal(userId, goalColumns[field]));
  const [monthlyIncomeCt, savedCt, retirementAgeCt, annualRateCt, withdrawalRateCt] = await Promise.all([
    seal("monthlyIncomeCents", centsCodec.encode(goal.monthlyIncomeCents)),
    seal("savedCents", centsCodec.encode(goal.savedCents)),
    seal("retirementAge", intCodec.encode(goal.retirementAge)),
    seal("annualRateBp", intCodec.encode(goal.annualRateBp)),
    seal("withdrawalRateBp", intCodec.encode(goal.withdrawalRateBp)),
  ]);
  return { monthlyIncomeCt, savedCt, retirementAgeCt, annualRateCt, withdrawalRateCt };
}

/** Seals the birth date (AAAA-MM-DD) of the user. */
export function sealBirthDate(dek: CryptoKey, userId: string, iso: string): Promise<Ct> {
  return encryptField(dek, dateCodec.encode(iso), fieldAad.birthDate(userId));
}
