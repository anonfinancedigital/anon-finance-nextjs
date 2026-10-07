import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  INVALID_LINK_MESSAGE,
  REQUEST_SENT_MESSAGE,
  requestResetSchema,
  resetPasswordSchema,
} from "./password-reset";

const EMAIL = "Informe um e-mail válido";
const LENGTH = "A senha deve ter entre 8 e 128 caracteres";
const MISMATCH = "As senhas não coincidem";

/** Issues as "path → message" pairs. */
function issues(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

describe("messages", () => {
  it("has the exact texts of the spec", () => {
    expect(REQUEST_SENT_MESSAGE).toBe(
      "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes",
    );
    expect(INVALID_LINK_MESSAGE).toBe("Link inválido ou expirado");
  });
});

describe("requestResetSchema", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(requestResetSchema.parse({ email: "  Ana@X.COM " })).toEqual({ email: "ana@x.com" });
  });

  it.each([[""], ["   "], ["ana"], ["ana@"], ["@x.com"]])("rejects %j with 'Informe um e-mail válido'", (email) => {
    expect(issues(requestResetSchema, { email })).toEqual([{ path: "email", message: EMAIL }]);
  });

  it("rejects a missing e-mail with 'Informe um e-mail válido'", () => {
    expect(issues(requestResetSchema, {})).toEqual([{ path: "email", message: EMAIL }]);
  });
});

describe("resetPasswordSchema", () => {
  const valid = { token: "tok-123", password: "12345678", confirmPassword: "12345678" };

  it("accepts a valid token, password and confirmation", () => {
    expect(resetPasswordSchema.parse(valid)).toEqual(valid);
  });

  it.each([[8], [128]])("accepts a password of %i characters", (length) => {
    const password = "a".repeat(length);
    expect(resetPasswordSchema.parse({ ...valid, password, confirmPassword: password }).password).toBe(password);
  });

  it.each([[7], [129]])("rejects a password of %i characters with the length message", (length) => {
    const password = "a".repeat(length);
    expect(issues(resetPasswordSchema, { ...valid, password, confirmPassword: password })).toEqual([
      { path: "password", message: LENGTH },
    ]);
  });

  it.each([["12345679"], [""], ["12345678 "]])("rejects the confirmation %j with 'As senhas não coincidem'", (confirmPassword) => {
    expect(issues(resetPasswordSchema, { ...valid, confirmPassword })).toEqual([
      { path: "confirmPassword", message: MISMATCH },
    ]);
  });

  it("rejects an empty token with 'Link inválido ou expirado'", () => {
    expect(issues(resetPasswordSchema, { ...valid, token: "" })).toEqual([
      { path: "token", message: "Link inválido ou expirado" },
    ]);
  });

  it("rejects a missing token with 'Link inválido ou expirado'", () => {
    const { password, confirmPassword } = valid;
    expect(issues(resetPasswordSchema, { password, confirmPassword })).toEqual([
      { path: "token", message: "Link inválido ou expirado" },
    ]);
  });
});
