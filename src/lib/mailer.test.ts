import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transportSendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail: transportSendMail }));

vi.mock("nodemailer", () => ({ createTransport }));

const SMTP_ENV = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "user@example.com",
  SMTP_PASS: "segredo",
  SMTP_FROM: "Orçamento <no-reply@example.com>",
} as const;

const message = { to: "ana@x.com", subject: "Redefinir sua senha", text: "corpo" };

/** Fresh module per test: the transport is cached inside it after the first call. */
async function loadMailer() {
  vi.resetModules();
  return (await import("./mailer")).sendMail;
}

beforeEach(() => {
  for (const [name, value] of Object.entries(SMTP_ENV)) vi.stubEnv(name, value);
  transportSendMail.mockReset();
  transportSendMail.mockResolvedValue({ messageId: "1" });
  createTransport.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendMail", () => {
  it("sends the message from SMTP_FROM with the given to, subject and text", async () => {
    const sendMail = await loadMailer();
    await expect(sendMail(message)).resolves.toBeUndefined();
    expect(transportSendMail).toHaveBeenCalledWith({
      from: "Orçamento <no-reply@example.com>",
      to: "ana@x.com",
      subject: "Redefinir sua senha",
      text: "corpo",
    });
  });

  it("creates the transport with the host, the numeric port and the credentials", async () => {
    const sendMail = await loadMailer();
    await sendMail(message);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "user@example.com", pass: "segredo" },
    });
  });

  it("creates the transport with implicit TLS on port 465", async () => {
    vi.stubEnv("SMTP_PORT", "465");
    const sendMail = await loadMailer();
    await sendMail(message);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "user@example.com", pass: "segredo" },
    });
  });

  it("creates the transport on the first call only", async () => {
    const sendMail = await loadMailer();
    expect(createTransport).not.toHaveBeenCalled();
    await sendMail(message);
    await sendMail({ ...message, to: "bia@x.com" });
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(transportSendMail).toHaveBeenCalledTimes(2);
    expect(transportSendMail).toHaveBeenLastCalledWith(expect.objectContaining({ to: "bia@x.com" }));
  });

  it.each(Object.keys(SMTP_ENV))("rejects with '%s não configurado' when the variable is missing", async (name) => {
    vi.stubEnv(name, undefined);
    const sendMail = await loadMailer();
    await expect(sendMail(message)).rejects.toThrow(new Error(`${name} não configurado`));
    expect(transportSendMail).not.toHaveBeenCalled();
  });

  it.each(Object.keys(SMTP_ENV))("rejects with '%s não configurado' when the variable is empty", async (name) => {
    vi.stubEnv(name, "");
    const sendMail = await loadMailer();
    await expect(sendMail(message)).rejects.toThrow(new Error(`${name} não configurado`));
    expect(transportSendMail).not.toHaveBeenCalled();
  });

  it("propagates a transport error to the caller", async () => {
    const failure = new Error("connect ECONNREFUSED");
    transportSendMail.mockRejectedValue(failure);
    const sendMail = await loadMailer();
    await expect(sendMail(message)).rejects.toBe(failure);
  });
});
