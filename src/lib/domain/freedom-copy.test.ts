import { describe, expect, it } from "vitest";
import { summarize, type Checkpoint } from "./freedom";
import { checkpointLabel, formatRate, heroPill, HOW_DISCLAIMER, HOW_TITLE, howWeCalculate, RATE_HINT, RATE_TITLE } from "./freedom-copy";

const normalize = (s: string) => s.replace(/\s/g, " ");

// 2026-06-15 em São Paulo; renda R$ 20.000,00, guardado 0, ápice aos 60 (240 meses).
const now = new Date("2026-06-15T15:00:00Z");
const goal = { monthlyIncomeCents: 2_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60 };

describe("rótulos do seletor", () => {
  it("título e legenda da rentabilidade real", () => {
    expect(RATE_TITLE).toBe("Rentabilidade real esperada");
    expect(RATE_HINT).toBe("Taxa real estimada (descontada a inflação)");
  });
});

describe("sem promessa de renda ou retorno", () => {
  const FORBIDDEN = ["perpétu", "garantid", "vitalíc"];
  const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 600 }, now);
  const texts = [RATE_TITLE, RATE_HINT, heroPill(summary)];

  it.each(FORBIDDEN)("nenhum texto contém \"%s\"", (root) => {
    for (const t of texts) expect(t.toLowerCase()).not.toContain(root);
  });
});

describe("checkpointLabel", () => {
  const cp = (over: Partial<Checkpoint>): Checkpoint => ({
    fractionBp: 5000,
    valueCents: 100_000_000,
    reached: false,
    months: 60,
    ageYears: 38,
    positionBp: 5000,
    ...over,
  });

  it("marco atingido mostra Atingido, também no último", () => {
    expect(checkpointLabel(cp({ reached: true, months: null, ageYears: null }), false)).toBe("Atingido");
    expect(checkpointLabel(cp({ reached: true, months: null, ageYears: null }), true)).toBe("Atingido");
  });

  it("marco com previsão mostra Aos N anos, sem a palavra Previsão", () => {
    expect(checkpointLabel(cp({ ageYears: 38 }), false)).toBe("Aos 38 anos");
  });

  it("último marco com previsão mostra Aos N anos (Meta)", () => {
    expect(checkpointLabel(cp({ ageYears: 45 }), true)).toBe("Aos 45 anos (Meta)");
  });

  it("marco sem previsão mostra Sem previsão", () => {
    expect(checkpointLabel(cp({ months: null, ageYears: null }), false)).toBe("Sem previsão");
  });
});

describe("formatRate", () => {
  it.each([
    [600, "6%"],
    [650, "6,5%"],
    [675, "6,75%"],
  ])("%d pb vira %s", (bp, text) => {
    expect(formatRate(bp)).toBe(text);
  });
});

describe("heroPill", () => {
  it("renda R$ 20.000 e retirada 6% a.a.", () => {
    const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 600 }, now);
    expect(normalize(heroPill(summary))).toBe("Gera R$ 20.000,00/mês com retirada de 6% a.a.");
  });
});

describe("howWeCalculate", () => {
  it("renda R$ 20.000, retirada 6% e meta R$ 4.000.000", () => {
    const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 600 }, now);
    expect(summary.targetCents).toBe(400_000_000);
    expect(normalize(howWeCalculate(summary))).toBe(
      "Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada segura de 6% a.a., seu patrimônio precisa ser de R$ 4.000.000,00 para perpetuar a renda sem consumir o principal investido.",
    );
  });

  it("retirada de 650 pb sai com vírgula decimal", () => {
    const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 650 }, now);
    expect(howWeCalculate(summary)).toContain("taxa de retirada segura de 6,5% a.a.");
  });

  it("título e aviso do popover", () => {
    expect(HOW_TITLE).toBe("Como chegamos a esse número:");
    expect(HOW_DISCLAIMER).toBe(
      "Simulação com base em rentabilidade real (líquida de inflação). Não representa garantia de rendimentos.",
    );
  });
});
