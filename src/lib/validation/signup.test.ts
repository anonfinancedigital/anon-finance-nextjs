import { describe, expect, it } from "vitest";
import { signupSchema } from "./signup";

const valid = { name: "Ana", email: "ana@x.com", password: "12345678", confirmPassword: "12345678" };
const MISMATCH = "As senhas não coincidem";

/** Issues as "path → message" pairs. */
function issues(input: unknown) {
  const result = signupSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.parse(valid)).toEqual(valid);
  });

  describe("name", () => {
    it("trims the name", () => {
      expect(signupSchema.parse({ ...valid, name: "  Ana  " }).name).toBe("Ana");
    });

    it.each([[""], ["   "]])("rejects %j with 'Informe seu nome'", (name) => {
      expect(issues({ ...valid, name })).toEqual([{ path: "name", message: "Informe seu nome" }]);
    });

    it("accepts 80 characters (after trimming)", () => {
      const name = "a".repeat(80);
      expect(signupSchema.parse({ ...valid, name: ` ${name} ` }).name).toBe(name);
    });

    it("rejects 81 characters", () => {
      expect(issues({ ...valid, name: "a".repeat(81) })).toEqual([
        { path: "name", message: "O nome deve ter no máximo 80 caracteres" },
      ]);
    });
  });

  describe("email", () => {
    it("normalizes case and surrounding spaces", () => {
      expect(signupSchema.parse({ ...valid, email: "  Ana@X.COM " }).email).toBe("ana@x.com");
    });

    it.each([["ana"], ["ana@"], ["@x.com"], [""]])("rejects %j with 'Informe um e-mail válido'", (email) => {
      expect(issues({ ...valid, email })).toEqual([
        { path: "email", message: "Informe um e-mail válido" },
      ]);
    });
  });

  describe("password", () => {
    it("rejects 7 characters", () => {
      expect(issues({ ...valid, password: "a".repeat(7), confirmPassword: "a".repeat(7) })).toEqual([
        { path: "password", message: "A senha deve ter pelo menos 8 caracteres" },
      ]);
    });

    it.each([[8], [128]])("accepts %i characters", (length) => {
      const password = "a".repeat(length);
      expect(signupSchema.parse({ ...valid, password, confirmPassword: password }).password).toBe(password);
    });

    it("rejects 129 characters", () => {
      expect(issues({ ...valid, password: "a".repeat(129), confirmPassword: "a".repeat(129) })).toEqual([
        { path: "password", message: "A senha deve ter no máximo 128 caracteres" },
      ]);
    });
  });

  describe("confirmPassword", () => {
    it.each([["12345679"], [""], ["12345678 "]])("rejects %j with 'As senhas não coincidem'", (confirmPassword) => {
      expect(issues({ ...valid, confirmPassword })).toEqual([{ path: "confirmPassword", message: MISMATCH }]);
    });

    it("rejects a missing confirmPassword", () => {
      const { name, email, password } = valid;
      expect(issues({ name, email, password })).toEqual([{ path: "confirmPassword", message: MISMATCH }]);
    });

    it("accepts 128 identical characters", () => {
      const password = "a".repeat(128);
      expect(signupSchema.parse({ ...valid, password, confirmPassword: password }).password).toBe(password);
    });

    it("keeps only the length error when a short password is confirmed identically", () => {
      expect(issues({ ...valid, password: "1234567", confirmPassword: "1234567" })).toEqual([
        { path: "password", message: "A senha deve ter pelo menos 8 caracteres" },
      ]);
    });
  });
});
