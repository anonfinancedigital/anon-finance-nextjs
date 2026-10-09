import { z } from "zod";
import { ciphertextSchema } from "./ciphertext";

const MALFORMED = "Dados inválidos";

/** Login secret derived in the browser: 32 bytes as 43 base64url characters (SIGILO-11). */
export const authSecretSchema = z
  .string({ error: MALFORMED })
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: MALFORMED });

/** Argon2id parameters: bounded so a client cannot store values that make the unlock unusable. */
export const kdfParamsSchema = z.object({
  memKib: z.number({ error: MALFORMED }).int({ error: MALFORMED }).min(8, MALFORMED).max(1_048_576, MALFORMED),
  iterations: z.number({ error: MALFORMED }).int({ error: MALFORMED }).min(1, MALFORMED).max(20, MALFORMED),
  parallelism: z.number({ error: MALFORMED }).int({ error: MALFORMED }).min(1, MALFORMED).max(16, MALFORMED),
});

/** KDF salt: 16 bytes as 22 base64url characters. */
export const saltSchema = z.string({ error: MALFORMED }).regex(/^[A-Za-z0-9_-]{22}$/, { error: MALFORMED });

/** The key material the browser sends (design: DTOs, `VaultMaterial`). */
export const vaultMaterialSchema = z.object({
  kdfVersion: z.literal(1, { error: MALFORMED }),
  salt: saltSchema,
  ...kdfParamsSchema.shape,
  dekWrappedPw: ciphertextSchema,
  dekWrappedRecovery: ciphertextSchema,
});
