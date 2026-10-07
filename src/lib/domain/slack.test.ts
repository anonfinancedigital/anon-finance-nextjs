import { describe, expect, it } from "vitest";
import { requiredMonthlyCents, summarize, type Goal } from "./freedom";
import { robustnessCheck, slackOptions } from "./slack";

// Cenário de referência: renda R$ 5.000,00, 8% real, retirada 5% (alvo R$ 1.200.000,00), R$ 565.000,00
// guardados, nascido em 1993-05-10, ápice aos 48; em 2026-06 o prazo é de 179 meses e a meta chega aos 43.
const now = new Date("2026-06-15T15:00:00Z");
const reference: Goal = {
  monthlyIncomeCents: 500_000,
  savedCents: 56_500_000,
  birthDate: "1993-05-10",
  retirementAge: 48,
  annualRateBp: 800,
  withdrawalRateBp: 500,
};
const optionsOf = (override: Partial<Goal> = {}) => slackOptions(summarize({ ...reference, ...override }, now));

describe("slackOptions", () => {
  it("referência: renda extra de R$ 7.420,00 e antecipação para os 43", () => {
    expect(optionsOf()).toEqual({ extraIncomeCents: 742_000, earlierAge: 43 });
  });

  // O patrimônio no prazo sem aportes não depende da renda, então a renda extra fica em R$ 7.420,00.
  it("renda extra 4,9% acima da desejada (R$ 7.073,41) não é oferecida", () => {
    expect(optionsOf({ monthlyIncomeCents: 707_341 }).extraIncomeCents).toBeNull();
  });

  it("renda extra 5% acima da desejada (R$ 7.066,66) é oferecida", () => {
    expect(optionsOf({ monthlyIncomeCents: 706_666 }).extraIncomeCents).toBe(742_000);
  });

  // A renda extra bruta é de R$ 7.420,50 (178.092.000 × 5% ÷ 12): vale o piso, R$ 7.420,00, e não R$ 7.421,00.
  it("renda extra com fração de R$ 0,50 ou mais arredonda para baixo em reais inteiros", () => {
    const summary = summarize(reference, now);
    const withFinal = (finalCents: number, monthlyIncomeCents: number) =>
      slackOptions({ ...summary, monthlyIncomeCents, reach: { ...summary.reach!, finalCents } });
    expect(withFinal(178_092_000, reference.monthlyIncomeCents).extraIncomeCents).toBe(742_000);
  });

  // 176.400.000 × 5% ÷ 12 = R$ 7.350,00 exatos; a renda desejada de R$ 7.000,00 deixa a extra em +5,00% justos.
  it("renda extra exatamente 5% acima da desejada é oferecida (pelo menos 5%)", () => {
    const summary = summarize(reference, now);
    const options = slackOptions({ ...summary, monthlyIncomeCents: 700_000, reach: { ...summary.reach!, finalCents: 176_400_000 } });
    expect(options.extraIncomeCents).toBe(735_000);
  });

  it("sem antecipação quando a meta só chega na idade-alvo (R$ 400.000,00 guardados, N = 48)", () => {
    const summary = summarize({ ...reference, savedCents: 40_000_000 }, now);
    expect(summary.reach?.ageYears).toBe(48);
    expect(slackOptions(summary).earlierAge).toBeNull();
  });

  it.each([
    ["aporte maior que 0", { savedCents: 10_000_000 }],
    ["guardado no alvo (já atingiu)", { savedCents: 120_000_000 }],
    ["guardado acima do alvo", { savedCents: 130_000_000 }],
    ["prazo encerrado", { birthDate: "1978-06-20" }],
    ["guardado R$ 0", { savedCents: 0 }],
  ] as const)("sem plano de chegada (%s) as duas opções são nulas", (_, override) => {
    expect(optionsOf(override)).toEqual({ extraIncomeCents: null, earlierAge: null });
  });

  it("aplicar a renda extra ao objetivo de referência mantém o aporte necessário em 0", () => {
    const { extraIncomeCents } = optionsOf();
    const applied = summarize({ ...reference, monthlyIncomeCents: extraIncomeCents! }, now);
    expect(applied.monthlyCents).toBe(0);
    // Renda extra aplicada: a antecipação some (N volta à idade-alvo) e a renda não é maior que ela mesma.
    expect(slackOptions(applied)).toEqual({ extraIncomeCents: null, earlierAge: null });
  });
});

describe("robustnessCheck", () => {
  it("referência: a 6% real o guardado ainda alcança o alvo sem aportes", () => {
    expect(robustnessCheck(summarize(reference, now))).toEqual({ reaches: true });
  });

  it("guardado R$ 400.000,00: a 6% real seria preciso o aporte necessário a 6% (86.467 centavos)", () => {
    const summary = summarize({ ...reference, savedCents: 40_000_000 }, now);
    expect(summary.monthlyCents).toBe(0);
    const expected = requiredMonthlyCents({ targetCents: 120_000_000, savedCents: 40_000_000, months: 179, annualRateBp: 600 });
    expect(expected).toBe(86_467);
    expect(robustnessCheck(summary)).toEqual({ reaches: false, monthlyCents: expected });
  });

  it.each([600, 550])("rentabilidade do objetivo de %d pb não tem teste de robustez", (annualRateBp) => {
    const summary = summarize({ ...reference, annualRateBp }, now);
    expect(summary.reach).not.toBeNull();
    expect(robustnessCheck(summary)).toBeNull();
  });

  it.each([
    ["aporte maior que 0", { savedCents: 10_000_000 }],
    ["guardado no alvo", { savedCents: 120_000_000 }],
    ["guardado R$ 0", { savedCents: 0 }],
    ["prazo encerrado", { birthDate: "1978-06-20" }],
  ] as const)("sem plano de chegada (%s) não há teste de robustez", (_, override) => {
    expect(robustnessCheck(summarize({ ...reference, ...override }, now))).toBeNull();
  });
});
