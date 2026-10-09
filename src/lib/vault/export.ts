import { decryptField } from "@/lib/crypto/aead";
import { centsCodec, microCodec, openNullable, textCodec } from "@/lib/crypto/fields";
import type { Goal } from "@/lib/domain/freedom";
import { isoOf, today } from "@/lib/validation/birth-date";
import { openBirthDate, openGoal } from "./open";
import { fieldAad, type GoalValues } from "./seal";
import type { ExportPayload, TransactionKind } from "./types";

/** Every row of the user, opened: the content of the export file (SIGILO-36). */
export type OpenedExport = {
  transactions: {
    id: string;
    kind: TransactionKind;
    date: string;
    categoryId: string | null;
    subcategoryId: string | null;
    amountCents: number;
    description: string | null;
    recurring: boolean;
    recurrenceDay: number | null;
    recurrenceEnd: string | null;
    seriesId: string | null;
  }[];
  categories: {
    id: string;
    name: string;
    color: number;
    isInvestment: boolean;
    deletedFrom: string | null;
    percentVersions: { fromMonth: string; percentMicro: number }[];
    subcategories: { id: string; name: string }[];
  }[];
  goal: GoalValues | null;
  birthDate: string | null;
};

const goalValues = ({ monthlyIncomeCents, savedCents, retirementAge, annualRateBp, withdrawalRateBp }: Goal) => ({
  monthlyIncomeCents,
  savedCents,
  retirementAge,
  annualRateBp,
  withdrawalRateBp,
});

/** Opens every sealed row of the export; any field that fails to open rejects with `DecryptError`. */
export async function openExport(dek: CryptoKey, userId: string, payload: ExportPayload): Promise<OpenedExport> {
  const open = (ct: string, aadText: string) => decryptField(dek, ct, aadText);
  const [transactions, categories, goal, birthDate] = await Promise.all([
    Promise.all(
      payload.transactions.map(async ({ amountCt, descriptionCt, ...t }) => {
        const [amount, description] = await Promise.all([
          open(amountCt, fieldAad.amount(userId, t.id)),
          openNullable(descriptionCt, (ct) => open(ct, fieldAad.description(userId, t.id))),
        ]);
        return {
          id: t.id,
          kind: t.kind,
          date: t.date,
          categoryId: t.categoryId,
          subcategoryId: t.subcategoryId,
          amountCents: centsCodec.decode(amount),
          description: description === null ? null : textCodec.decode(description),
          recurring: t.recurring,
          recurrenceDay: t.recurrenceDay,
          recurrenceEnd: t.recurrenceEnd,
          seriesId: t.seriesId,
        };
      }),
    ),
    Promise.all(
      payload.categories.map(async (c) => {
        const [name, percentVersions, subcategories] = await Promise.all([
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
        return {
          id: c.id,
          name,
          color: c.color,
          isInvestment: c.isInvestment,
          deletedFrom: c.deletedFrom,
          percentVersions,
          subcategories,
        };
      }),
    ),
    payload.goal ? openGoal(dek, userId, payload.goal, "").then(goalValues) : null,
    openBirthDate(dek, userId, payload.birthDateCt),
  ]);
  return { transactions, categories, goal, birthDate };
}

/** Text of the export file: the opened sections as indented JSON. */
export function buildExport(opened: OpenedExport): string {
  return JSON.stringify(opened, null, 2);
}

/** `orcamento-dados-AAAA-MM-DD.json` with today's date in America/Sao_Paulo. */
export function exportFileName(now: Date): string {
  return `orcamento-dados-${isoOf(today(now))}.json`;
}
