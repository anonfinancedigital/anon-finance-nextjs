import { z } from "zod";

const NAME_MESSAGE = "Informe seu nome";
const EMAIL_MESSAGE = "Informe um e-mail válido";
export const PASSWORD_MISMATCH_MESSAGE = "As senhas não coincidem";
const PASSWORD_MIN_MESSAGE = "A senha deve ter pelo menos 8 caracteres";

/** Signup form: name trimmed (1-80), e-mail normalized (trim + lower case), password 8-128 confirmed exactly. */
export const signupSchema = z
  .object({
    name: z
      .string({ error: NAME_MESSAGE })
      .trim()
      .min(1, NAME_MESSAGE)
      .max(80, "O nome deve ter no máximo 80 caracteres"),
    email: z
      .string({ error: EMAIL_MESSAGE })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: EMAIL_MESSAGE })),
    password: z
      .string({ error: PASSWORD_MIN_MESSAGE })
      .min(8, PASSWORD_MIN_MESSAGE)
      .max(128, "A senha deve ter no máximo 128 caracteres"),
    confirmPassword: z.string({ error: PASSWORD_MISMATCH_MESSAGE }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: PASSWORD_MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });
