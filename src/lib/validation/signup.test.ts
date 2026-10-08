import { describe, expect, it } from "vitest";
import { signupSchema } from "./signup";

const valid = {
  name: "Ana",
  email: "ana@x.com",
  birthDate: "18/09/1993",
  password: "12345678",
  confirmPassword: "12345678",
};
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
    expect(signupSchema.parse(valid)).toEqual({ ...valid, birthDate: "1993-09-18" });
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

  describe("birthDate", () => {
    const todayBR = () => {
      const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
        .format(new Date())
        .split("-");
      return { br: `${d}/${m}/${y}`, iso: `${y}-${m}-${d}` };
    };
    const tomorrowBR = () => {
      const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
        .format(new Date(Date.now() + 36 * 3600_000))
        .split("-");
      return `${d}/${m}/${y}`;
    };

    it("turns DD/MM/AAAA into ISO (NASC-02)", () => {
      expect(signupSchema.parse({ ...valid, birthDate: "18/09/1993" }).birthDate).toBe("1993-09-18");
    });

    it.each([[""], ["   "]])("rejects %j with 'Informe a data de nascimento' (NASC-03)", (birthDate) => {
      expect(issues({ ...valid, birthDate })).toEqual([
        { path: "birthDate", message: "Informe a data de nascimento" },
      ]);
    });

    it("rejects a missing birthDate with 'Informe a data de nascimento' (NASC-03)", () => {
      const { name, email, password, confirmPassword } = valid;
      expect(issues({ name, email, password, confirmPassword })).toEqual([{ path: "birthDate", message: "Informe a data de nascimento" }]);
    });

    it.each([["31/02/1990"], ["1990-01-01"]])("rejects %j with 'Data de nascimento inválida' (NASC-04)", (birthDate) => {
      expect(issues({ ...valid, birthDate })).toEqual([
        { path: "birthDate", message: "Data de nascimento inválida" },
      ]);
    });

    it("rejects a future date (NASC-05)", () => {
      expect(issues({ ...valid, birthDate: tomorrowBR() })).toEqual([
        { path: "birthDate", message: "A data de nascimento não pode ser futura" },
      ]);
    });

    it("rejects an age above 120 (NASC-06)", () => {
      expect(issues({ ...valid, birthDate: "01/01/1800" })).toEqual([
        { path: "birthDate", message: "A idade atual deve ser de no máximo 120 anos" },
      ]);
    });

    it("accepts today (NASC-07)", () => {
      const { br, iso } = todayBR();
      expect(signupSchema.parse({ ...valid, birthDate: br }).birthDate).toBe(iso);
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
      const { name, email, birthDate, password } = valid;
      expect(issues({ name, email, birthDate, password })).toEqual([{ path: "confirmPassword", message: MISMATCH }]);
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
