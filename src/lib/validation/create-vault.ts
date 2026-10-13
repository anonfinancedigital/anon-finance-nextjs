import { z } from "zod";
import { parseBirthDate } from "./birth-date";
import { ciphertextSchema } from "./ciphertext";
import { PASSWORD_MISMATCH_MESSAGE } from "./signup";
import { vaultMaterialSchema } from "./vault";

const BIRTH_DATE_MESSAGE = "Informe a data de nascimento";
const PASSWORD_MIN_MESSAGE = "A senha deve ter pelo menos 8 caracteres";

/** What the browser sends to create a vault: wrapped keys and the sealed birth date, never plaintext. */
export const createVaultPayloadSchema = z.strictObject({
  vault: vaultMaterialSchema,
  birthDateCt: ciphertextSchema,
});

export type CreateVaultPayload = z.input<typeof createVaultPayloadSchema>;

/** Form of `/criar-cofre`: vault password 8-128 confirmed exactly, birth date "DD/MM/AAAA" turned into "AAAA-MM-DD". */
export const createVaultFormSchema = z
  .object({
    password: z
      .string({ error: PASSWORD_MIN_MESSAGE })
      .min(8, PASSWORD_MIN_MESSAGE)
      .max(128, "A senha deve ter no máximo 128 caracteres"),
    confirmPassword: z.string({ error: PASSWORD_MISMATCH_MESSAGE }),
    birthDate: z.string({ error: BIRTH_DATE_MESSAGE }).transform((value, ctx) => {
      const parsed = parseBirthDate(value, new Date());
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", message: parsed.error });
        return z.NEVER;
      }
      return parsed.value.iso;
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: PASSWORD_MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });
