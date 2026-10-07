import { z } from "zod";
import { PASSWORD_MISMATCH_MESSAGE } from "./signup";

const EMAIL_MESSAGE = "Informe um e-mail válido";
const PASSWORD_LENGTH_MESSAGE = "A senha deve ter entre 8 e 128 caracteres";

/** Resposta única do pedido, exista ou não a conta. */
export const REQUEST_SENT_MESSAGE =
  "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes";

/** Token ausente, desconhecido, expirado, usado, substituído ou de conta não aprovada. */
export const INVALID_LINK_MESSAGE = "Link inválido ou expirado";

/** Pedido de redefinição: e-mail normalizado (trim + minúsculas). */
export const requestResetSchema = z.object({
  email: z
    .string({ error: EMAIL_MESSAGE })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: EMAIL_MESSAGE })),
});

/** Nova senha: token não vazio, senha de 8 a 128 caracteres e confirmação idêntica. */
export const resetPasswordSchema = z
  .object({
    token: z.string({ error: INVALID_LINK_MESSAGE }).min(1, INVALID_LINK_MESSAGE),
    password: z
      .string({ error: PASSWORD_LENGTH_MESSAGE })
      .min(8, PASSWORD_LENGTH_MESSAGE)
      .max(128, PASSWORD_LENGTH_MESSAGE),
    confirmPassword: z.string({ error: PASSWORD_MISMATCH_MESSAGE }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: PASSWORD_MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });
