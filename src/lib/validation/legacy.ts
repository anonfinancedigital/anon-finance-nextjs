import { z } from "zod";
import { ciphertextSchema, nullableCiphertextSchema } from "./ciphertext";
import { authSecretSchema, vaultMaterialSchema } from "./vault";

const id = z.string().min(1).max(64);
const month = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Structure of the sealed package the browser sends to finish the legacy migration (SIGILO-23). */
export const legacyPackageSchema = z.object({
  transactions: z
    .array(z.object({ id, amountCt: ciphertextSchema, descriptionCt: nullableCiphertextSchema }))
    .max(100_000),
  categories: z
    .array(
      z.object({
        id,
        nameCt: ciphertextSchema,
        versions: z.array(z.object({ fromMonth: month, percentCt: ciphertextSchema })).max(1_000),
        subcategories: z.array(z.object({ id, nameCt: ciphertextSchema })).max(1_000),
      }),
    )
    .max(10_000),
  goal: z
    .object({
      monthlyIncomeCt: ciphertextSchema,
      savedCt: ciphertextSchema,
      retirementAgeCt: ciphertextSchema,
      annualRateCt: ciphertextSchema,
      withdrawalRateCt: ciphertextSchema,
    })
    .nullable(),
  birthDateCt: nullableCiphertextSchema,
});

export const commitLegacyMigrationSchema = z.object({
  oldPassword: z.string().min(1).max(128),
  authSecret: authSecretSchema,
  vault: vaultMaterialSchema,
  pkg: legacyPackageSchema,
});

export type CommitLegacyMigrationPayload = z.input<typeof commitLegacyMigrationSchema>;
