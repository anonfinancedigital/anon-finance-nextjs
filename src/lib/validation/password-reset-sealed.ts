import { z } from "zod";
import { ciphertextSchema } from "./ciphertext";
import { INVALID_LINK_MESSAGE } from "./password-reset";
import { authSecretSchema, kdfParamsSchema, saltSchema, vaultMaterialSchema } from "./vault";

const token = z.string({ error: INVALID_LINK_MESSAGE }).min(1, INVALID_LINK_MESSAGE);

/**
 * Sealed reset payload (SIGILO-19 / SIGILO-21). `rewrap`: the user had the recovery key, so the DEK
 * is rewrapped with the new KEK. `wipe`: the key was lost, so a whole new vault replaces the old one.
 */
export const resetPasswordSealedSchema = z.discriminatedUnion(
  "mode",
  [
    z.object({
      mode: z.literal("rewrap"),
      token,
      authSecret: authSecretSchema,
      salt: saltSchema,
      params: kdfParamsSchema,
      dekWrappedPw: ciphertextSchema,
    }),
    z.object({
      mode: z.literal("wipe"),
      token,
      authSecret: authSecretSchema,
      vault: vaultMaterialSchema,
    }),
  ],
  { error: "Dados inválidos" },
);

export type ResetPasswordSealedPayload = z.input<typeof resetPasswordSealedSchema>;
