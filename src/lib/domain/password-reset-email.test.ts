import { describe, expect, it } from "vitest";
import { buildPasswordResetEmail, RESET_TOKEN_TTL_MINUTES } from "./password-reset-email";

const input = { to: "ana@x.com", token: "tok-123", baseUrl: "https://orcamento.example.com" };

describe("buildPasswordResetEmail", () => {
  it("addresses the e-mail to the given recipient with the subject 'Redefinir sua senha'", () => {
    const email = buildPasswordResetEmail(input);
    expect(email.to).toBe("ana@x.com");
    expect(email.subject).toBe("Redefinir sua senha");
  });

  it("links to /redefinir-senha on the base URL carrying the token", () => {
    const { text } = buildPasswordResetEmail(input);
    expect(text).toContain("https://orcamento.example.com/redefinir-senha?token=tok-123");
  });

  it("encodes the token for the query string", () => {
    const { text } = buildPasswordResetEmail({ ...input, token: "a+b/c=d&e" });
    expect(text).toContain("https://orcamento.example.com/redefinir-senha?token=a%2Bb%2Fc%3Dd%26e");
    expect(text).not.toContain("a+b/c=d&e");
  });

  it("states that the link is valid for 30 minutes", () => {
    expect(RESET_TOKEN_TTL_MINUTES).toBe(30);
    expect(buildPasswordResetEmail(input).text).toContain("30 minutos");
  });

  it("derives the validity in the text from the TTL, not from a fixed '30'", () => {
    const { text } = buildPasswordResetEmail({ ...input, ttlMinutes: 45 });
    expect(text).toContain("45 minutos");
    expect(text).not.toContain("30 minutos");
  });
});
