import { describe, expect, it } from "vitest";
import { summarize } from "./freedom";
import { heroFacts, HOW_WE_CALCULATE, RATE_HINT, RATE_TITLE } from "./freedom-copy";

const normalize = (s: string) => s.replace(/\s/g, " ");

// 2026-06-15 em São Paulo; renda R$ 20.000,00, guardado 0, ápice aos 60 (240 meses).
const now = new Date("2026-06-15T15:00:00Z");
const goal = { monthlyIncomeCents: 2_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60 };
const factsOf = (annualRateBp: 600 | 800 | 1000) =>
  heroFacts(summarize({ ...goal, annualRateBp }, now)).map((f) => `${f.label} ${normalize(f.value)}`);

describe("rótulos do seletor", () => {
  it("título e legenda da rentabilidade real", () => {
    expect(RATE_TITLE).toBe("Rentabilidade real esperada");
    expect(RATE_HINT).toBe("Taxa real estimada (descontada a inflação)");
  });
});

describe("heroFacts", () => {
  it.each([
    [600, "6%", "4%", "R$ 6.000.000,00"],
    [800, "8%", "6%", "R$ 4.000.000,00"],
    [1000, "10%", "7%", "R$ 3.428.571,43"],
  ] as const)("%d pb: rentabilidade %s, retirada %s, renda e patrimônio %s", (rate, real, withdrawal, target) => {
    expect(factsOf(rate)).toEqual([
      `Rentabilidade real ${real} a.a.`,
      `Taxa de retirada ${withdrawal} a.a.`,
      "Renda desejada R$ 20.000,00/mês",
      `Patrimônio necessário ${target}`,
    ]);
  });
});

describe("Como calculamos?", () => {
  const text = HOW_WE_CALCULATE.join(" ");

  it("traz o texto do pedido", () => {
    expect(text).toContain(
      "A rentabilidade real representa o crescimento estimado do patrimônio acima da inflação. A taxa de retirada representa a parcela anual do patrimônio utilizada para gerar a renda desejada.",
    );
  });

  it("diz que a taxa de retirada varia conforme o cenário", () => {
    expect(text).toContain("A taxa de retirada varia conforme o cenário escolhido");
  });

  it("diz que são premissas de simulação, não promessa de renda nem de retorno", () => {
    expect(text).toContain("Os valores são premissas de simulação, não promessa de renda nem de retorno.");
  });
});

describe("sem promessa de renda ou retorno", () => {
  const FORBIDDEN = ["perpétu", "garantid", "vitalíc"];
  const texts = [
    RATE_TITLE,
    RATE_HINT,
    ...HOW_WE_CALCULATE,
    ...([600, 800, 1000] as const).flatMap(factsOf),
  ];

  it.each(FORBIDDEN)("nenhum texto contém \"%s\"", (root) => {
    for (const t of texts) expect(t.toLowerCase()).not.toContain(root);
  });
});
