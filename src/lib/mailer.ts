import { createTransport, type Transporter } from "nodemailer";

export type MailMessage = { to: string; subject: string; text: string };

let transporter: Transporter | undefined;

/** Value of an SMTP variable; missing or empty throws `Error("<NAME> não configurado")`. */
function smtpEnv(name: "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS" | "SMTP_FROM"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurado`);
  return value;
}

/** Sends a plain-text e-mail through SMTP; the transport is created on the first call from `SMTP_*`. */
export async function sendMail(message: MailMessage): Promise<void> {
  const from = smtpEnv("SMTP_FROM");
  const port = Number(smtpEnv("SMTP_PORT"));
  transporter ??= createTransport({
    host: smtpEnv("SMTP_HOST"),
    port,
    // 465 opens the connection already encrypted (implicit TLS); other ports (587) upgrade with STARTTLS.
    secure: port === 465,
    auth: { user: smtpEnv("SMTP_USER"), pass: smtpEnv("SMTP_PASS") },
  });
  await transporter.sendMail({ from, to: message.to, subject: message.subject, text: message.text });
}
