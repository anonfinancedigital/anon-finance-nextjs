import { describe, expect, it } from "vitest";
import { goalSchema } from "./goal";

// 2026-06-15 12:00 em São Paulo; quem nasceu em 1990-06-15 tem 36 anos.
const now = new Date("2026-06-15T15:00:00Z");
const valid = {
  monthlyIncome: "10.000,00",
  saved: "150.000,00",
  birthDate: "1990-06-15",
  retirementAge: "60",
};

const parse = (override: Partial<typeof valid>) => goalSchema(now).safeParse({ ...valid, ...override });

/** Mensagens por campo da primeira rejeição; vazio se o parse passou. */
function errors(override: Partial<typeof valid>): Record<string, string> {
  const result = parse(override);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe("goalSchema", () => {
  it("converte entrada válida em valores de domínio", () => {
    const result = parse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        monthlyIncomeCents: 1_000_000,
        savedCents: 15_000_000,
        birthDate: "1990-06-15",
        retirementAge: 60,
      });
    }
  });

  describe("renda mensal", () => {
    it.each([[""], ["0"], ["0,00"], ["1.000.000,01"], ["abc"]])("rejeita %j no campo monthlyIncome", (monthlyIncome) => {
      expect(errors({ monthlyIncome }).monthlyIncome?.length).toBeGreaterThan(0);
    });

    it("rejeita acima de R$ 1.000.000,00 com mensagem do limite", () => {
      expect(errors({ monthlyIncome: "1.000.000,01" }).monthlyIncome).toBe("A renda máxima é R$ 1.000.000,00");
    });

    it("aceita R$ 0,01 e R$ 1.000.000,00", () => {
      const low = parse({ monthlyIncome: "0,01" });
      const high = parse({ monthlyIncome: "1.000.000,00" });
      expect(low.success && low.data.monthlyIncomeCents).toBe(1);
      expect(high.success && high.data.monthlyIncomeCents).toBe(100_000_000);
    });
  });

  describe("valor guardado", () => {
    it.each([[""], ["-1"], ["1.000.000.000,00"], ["abc"]])("rejeita %j no campo saved", (saved) => {
      expect(errors({ saved }).saved?.length).toBeGreaterThan(0);
    });

    it("aceita R$ 0,00 e R$ 999.999.999,99", () => {
      const zero = parse({ saved: "0,00" });
      const max = parse({ saved: "999.999.999,99" });
      expect(zero.success && zero.data.savedCents).toBe(0);
      expect(max.success && max.data.savedCents).toBe(99_999_999_999);
    });
  });

  describe("data de nascimento", () => {
    it.each([[""], ["1990-02-31"], ["15/06/1990"]])("rejeita %j no campo birthDate", (birthDate) => {
      expect(errors({ birthDate }).birthDate?.length).toBeGreaterThan(0);
    });

    it("rejeita data futura", () => {
      expect(errors({ birthDate: "2026-06-16" }).birthDate).toBe("A data de nascimento não pode ser futura");
    });

    it("rejeita idade atual acima de 120 anos", () => {
      expect(errors({ birthDate: "1905-06-15" }).birthDate).toBe("A idade atual deve ser de no máximo 120 anos");
    });

    it("aceita idade atual de exatamente 120 anos (sem erro de nascimento)", () => {
      expect(errors({ birthDate: "1906-06-15", retirementAge: "120" }).birthDate).toBeUndefined();
    });

    it("aceita nascimento hoje", () => {
      const result = parse({ birthDate: "2026-06-15", retirementAge: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("idade de aposentadoria", () => {
    it.each([[""], ["60,5"], ["abc"], ["-3"], ["0"], ["121"]])("rejeita %j no campo retirementAge", (retirementAge) => {
      expect(errors({ retirementAge }).retirementAge?.length).toBeGreaterThan(0);
    });

    it("rejeita idade igual ou menor que a atual (36)", () => {
      expect(errors({ retirementAge: "36" }).retirementAge).toBe(
        "A idade de aposentadoria deve ser maior que a idade atual (36)",
      );
      expect(errors({ retirementAge: "30" }).retirementAge).toBe(
        "A idade de aposentadoria deve ser maior que a idade atual (36)",
      );
    });

    it("aceita idade atual + 1 e o máximo 120", () => {
      const next = parse({ retirementAge: "37" });
      const max = parse({ retirementAge: "120" });
      expect(next.success && next.data.retirementAge).toBe(37);
      expect(max.success && max.data.retirementAge).toBe(120);
    });

    it("antes do aniversário a idade atual ainda é a anterior", () => {
      // nasceu em 1990-06-16: tem 35 anos em 2026-06-15, então 36 é válido
      const result = parse({ birthDate: "1990-06-16", retirementAge: "36" });
      expect(result.success).toBe(true);
    });
  });

  it("reporta erro em cada campo inválido ao mesmo tempo", () => {
    const all = errors({ monthlyIncome: "", saved: "", birthDate: "", retirementAge: "" });
    expect(Object.keys(all).sort()).toEqual(["birthDate", "monthlyIncome", "retirementAge", "saved"]);
  });
});
