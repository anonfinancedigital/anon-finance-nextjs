import { z } from "zod";

export const CIPHERTEXT_MESSAGE = "Texto cifrado inválido";

/** Sealed field: `v1:<base64url>`, at most 2048 characters (SIGILO-10). */
export const ciphertextSchema = z
  .string({ error: CIPHERTEXT_MESSAGE })
  .max(2048, { error: CIPHERTEXT_MESSAGE })
  .regex(/^v1:[A-Za-z0-9_-]+$/, { error: CIPHERTEXT_MESSAGE });

/** A sealed field that may be absent as an explicit `null` (never `undefined`). */
export const nullableCiphertextSchema = ciphertextSchema.nullable();
