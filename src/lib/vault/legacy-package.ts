import { encryptField } from "@/lib/crypto/aead";
import { microCodec, sealNullable, textCodec } from "@/lib/crypto/fields";
import { fieldAad, sealBirthDate, sealGoal, sealTransaction } from "./seal";
import type { LegacyPackage, LegacyPlain } from "./types";

/**
 * Seals every row of a legacy account in the browser (SIGILO-23), each field under the AAD of its own
 * row (`fieldAad`). The package keeps the ids of `plain`, so the server swaps values row by row.
 */
export async function buildLegacyPackage(input: {
  plain: LegacyPlain;
  userId: string;
  dek: CryptoKey;
}): Promise<LegacyPackage> {
  const { plain, userId, dek } = input;
  const sealText = (text: string, aadText: string) => encryptField(dek, textCodec.encode(text), aadText);

  const [transactions, categories, goal, birthDateCt] = await Promise.all([
    Promise.all(
      plain.transactions.map(async (t) => ({ id: t.id, ...(await sealTransaction(dek, userId, t.id, t)) })),
    ),
    Promise.all(
      plain.categories.map(async (c) => {
        const [nameCt, versions, subcategories] = await Promise.all([
          sealText(c.name, fieldAad.categoryName(userId, c.id)),
          Promise.all(
            c.versions.map(async (v) => ({
              fromMonth: v.fromMonth,
              percentCt: await encryptField(
                dek,
                microCodec.encode(v.percentMicro),
                fieldAad.percent(userId, c.id, v.fromMonth),
              ),
            })),
          ),
          Promise.all(
            c.subcategories.map(async (s) => ({
              id: s.id,
              nameCt: await sealText(s.name, fieldAad.subcategoryName(userId, s.id)),
            })),
          ),
        ]);
        return { id: c.id, nameCt, versions, subcategories };
      }),
    ),
    plain.goal === null ? null : sealGoal(dek, userId, plain.goal),
    sealNullable(plain.birthDate, (iso) => sealBirthDate(dek, userId, iso)),
  ]);
  return { transactions, categories, goal, birthDateCt };
}
