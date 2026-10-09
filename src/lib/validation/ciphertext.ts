import { z } from "zod";

/** Sealed field: `v1:<base64url>`, at most 2048 characters (SIGILO-10). */
export const ciphertextSchema = z
  .string({ error: "Texto cifrado inválido" })
  .max(2048, { error: "Texto cifrado inválido" })
  .regex(/^v1:[A-Za-z0-9_-]+$/, { error: "Texto cifrado inválido" });

/** A sealed field that may be absent as an explicit `null` (never `undefined`). */
export const nullableCiphertextSchema = ciphertextSchema.nullable();
