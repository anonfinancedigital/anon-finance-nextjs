import { z } from "zod";
import { ciphertextSchema } from "./ciphertext";
import { emailSchema, nameSchema } from "./signup";
import { authSecretSchema, vaultMaterialSchema } from "./vault";

/** Sealed signup payload (SIGILO-11): the id is chosen by the client because the AAD of its sealed fields names it. */
export const signUpSealedSchema = z.object({
  userId: z.uuid({ error: "Dados inválidos" }),
  name: nameSchema,
  email: emailSchema,
  authSecret: authSecretSchema,
  vault: vaultMaterialSchema,
  birthDateCt: ciphertextSchema,
});

export type SignUpSealedPayload = z.input<typeof signUpSealedSchema>;
