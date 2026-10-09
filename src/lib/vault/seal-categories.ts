import { encryptField } from "@/lib/crypto/aead";
import { microCodec, textCodec } from "@/lib/crypto/fields";
import { currentMonth } from "@/lib/domain/month";
import { monthStartOf, type PercentVersion, resolvePercent } from "@/lib/domain/percent-history";
import { fieldAad } from "./seal";
import type { CategorySetDto } from "./types";

/** One category of the editor, already validated (`validateCategorySet`). No `id` = new. */
export type CategoryDraft = {
  id?: string;
  name: string;
  percentMicro: number;
  color: number;
  /** Omitted means false. */
  isInvestment?: boolean;
  /** No `id` = new. Subcategories left out are removed by the server. */
  subcategories?: { id?: string; name: string }[];
};

/**
 * Seals the whole category set. A new category gets a client id (`clientId`, no `id`); every
 * subcategory leaves with an `id` (a new one gets a fresh uuid), so each name is sealed with the AAD
 * of its own row. `percentChange` (in force from the current month of America/Sao_Paulo) is sent
 * only for a new category or when the percent differs from the version in force this month, taken
 * from `current` (versions of the existing categories by id).
 */
export async function sealCategorySet(
  dek: CryptoKey,
  userId: string,
  items: CategoryDraft[],
  current: ReadonlyMap<string, PercentVersion[]>,
  now: Date,
): Promise<CategorySetDto> {
  const fromMonth = monthStartOf(currentMonth(now));
  const sealed = await Promise.all(
    items.map(async (item) => {
      const rowId = item.id ?? crypto.randomUUID();
      const inForce = item.id ? resolvePercent(current.get(item.id) ?? [], fromMonth) : null;
      const [nameCt, percentCt, subcategories] = await Promise.all([
        encryptField(dek, textCodec.encode(item.name), fieldAad.categoryName(userId, rowId)),
        inForce === item.percentMicro
          ? null
          : encryptField(dek, microCodec.encode(item.percentMicro), fieldAad.percent(userId, rowId, fromMonth)),
        Promise.all(
          (item.subcategories ?? []).map(async (sub) => {
            const id = sub.id ?? crypto.randomUUID();
            const nameCt = await encryptField(dek, textCodec.encode(sub.name), fieldAad.subcategoryName(userId, id));
            return { id, nameCt };
          }),
        ),
      ]);
      return {
        ...(item.id !== undefined && { id: item.id }),
        clientId: rowId,
        color: item.color,
        isInvestment: item.isInvestment ?? false,
        nameCt,
        ...(percentCt !== null && { percentChange: { fromMonth, percentCt } }),
        subcategories,
      };
    }),
  );
  return { items: sealed };
}
