import { describe, expect, it } from "vitest";
import { goalSchema } from "./goal";

// 2026-06-15 12:00 em São Paulo; quem nasceu em 1990-06-15 tem 36 anos.
const now = new Date("2026-06-15T15:00:00Z");
const valid = {
  monthlyIncome: "10.000,00",
  saved: "150.000,00",
  birthDate: "15/06/1990",
  retirementAge: "60",
  annualRate: "8",
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
        annualRateBp: 800,
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
    it("vazio pede a data de nascimento", () => {
      expect(errors({ birthDate: "" }).birthDate).toBe("Informe a data de nascimento");
    });

    it.each([["31/02/1990"], ["1990-06-15"], ["15/06/90"], ["15-06-1990"], ["abc"]])(
      "rejeita %j como data de nascimento inválida",
      (birthDate) => {
        expect(errors({ birthDate }).birthDate).toBe("Data de nascimento inválida");
      },
    );

    it("grava a data em AAAA-MM-DD a partir de DD/MM/AAAA", () => {
      const result = parse({ birthDate: "15/06/1990" });
      expect(result.success && result.data.birthDate).toBe("1990-06-15");
    });

    it("rejeita data futura", () => {
      expect(errors({ birthDate: "16/06/2026" }).birthDate).toBe("A data de nascimento não pode ser futura");
    });

    it("rejeita idade atual acima de 120 anos", () => {
      expect(errors({ birthDate: "15/06/1905" }).birthDate).toBe("A idade atual deve ser de no máximo 120 anos");
    });

    it("aceita idade atual de exatamente 120 anos (sem erro de nascimento)", () => {
      expect(errors({ birthDate: "15/06/1906", retirementAge: "120" }).birthDate).toBeUndefined();
    });

    it("usa o dia de São Paulo como hoje (23:00 de 15/06 em SP já é 16/06 em UTC)", () => {
      const lateNow = new Date("2026-06-16T02:00:00Z");
      const result = goalSchema(lateNow).safeParse({ ...valid, birthDate: "16/06/1990", retirementAge: "36" });
      expect(result.success).toBe(true);
    });

    it("aceita nascimento hoje", () => {
      const result = parse({ birthDate: "15/06/2026", retirementAge: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("taxa anual", () => {
    it.each([
      ["6", 600],
      ["8", 800],
      ["10", 1000],
    ])("taxa %j vira %d pontos-base", (annualRate, expected) => {
      const result = parse({ annualRate });
      expect(result.success && result.data.annualRateBp).toBe(expected);
    });

    it.each([["7"], [""], ["abc"], ["12"], ["8,0"]])("rejeita %j no campo annualRate", (annualRate) => {
      expect(errors({ annualRate }).annualRate).toBe("Escolha uma taxa de 6%, 8% ou 10% ao ano");
    });

    it("rejeita taxa ausente", () => {
      expect(errors({ annualRate: undefined }).annualRate).toBe("Escolha uma taxa de 6%, 8% ou 10% ao ano");
    });
  });

  describe("idade de aposentadoria", () => {
    it.each([[""], ["60,5"], ["60.5"], ["1e2"], ["abc"], ["-3"], ["0"], ["121"]])("rejeita %j no campo retirementAge", (retirementAge) => {
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
      const result = parse({ birthDate: "16/06/1990", retirementAge: "36" });
      expect(result.success).toBe(true);
    });
  });

  it("reporta erro em cada campo inválido ao mesmo tempo", () => {
    const all = errors({ monthlyIncome: "", saved: "", birthDate: "", retirementAge: "", annualRate: "" });
    expect(Object.keys(all).sort()).toEqual(["annualRate", "birthDate", "monthlyIncome", "retirementAge", "saved"]);
  });
});
