/** Validade do link de redefinição, em minutos: usada pelo repositório e pelo texto do e-mail. */
export const RESET_TOKEN_TTL_MINUTES = 30;

export type PasswordResetEmail = { to: string; subject: string; text: string };

/**
 * E-mail de texto simples com o link `${baseUrl}/redefinir-senha?token=...` e a validade do link.
 */
// SPEC_DEVIATION: `ttlMinutes` opcional (padrão RESET_TOKEN_TTL_MINUTES) além de { to, token, baseUrl }.
// Reason: o Done-when do T3 pede um teste que prove que o texto segue a constante; sem o parâmetro
// não há como trocar o valor no teste.
export function buildPasswordResetEmail(input: {
  to: string;
  token: string;
  baseUrl: string;
  ttlMinutes?: number;
}): PasswordResetEmail {
  const { to, token, baseUrl, ttlMinutes = RESET_TOKEN_TTL_MINUTES } = input;
  const link = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const text = [
    "Olá,",
    "",
    "Recebemos um pedido para redefinir a senha da sua conta.",
    "Para criar uma nova senha, abra o link abaixo:",
    "",
    link,
    "",
    `O link vale por ${ttlMinutes} minutos e só pode ser usado uma vez.`,
    "Se você não fez este pedido, ignore este e-mail. Sua senha continua a mesma.",
  ].join("\n");
  return { to, subject: "Redefinir sua senha", text };
}
