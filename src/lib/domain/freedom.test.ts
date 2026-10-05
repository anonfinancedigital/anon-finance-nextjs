import { describe, expect, it } from "vitest";
import {
  ageOn,
  ANNUAL_RATES,
  chartYMax,
  compositionShares,
  DEFAULT_ANNUAL_RATE_BP,
  getWithdrawalRate,
  interestSharePct,
  monthlyRate,
  projectTimeline,
  monthsUntilRetirement,
  progressBp,
  requiredMonthlyCents,
  summarize,
  targetCents,
  WITHDRAWAL_RATE_BP,
} from "./freedom";
import type { Goal } from "./freedom";

describe("getWithdrawalRate", () => {
  it.each([
    [600, 400],
    [800, 600],
    [1000, 700],
  ])("rentabilidade %d pb tem retirada de %d pb", (rate, expected) => {
    expect(getWithdrawalRate(rate)).toBe(expected);
  });

  it.each([[0], [500], [700], [1200], [NaN]])("rentabilidade %d pb fora da tabela lança RangeError", (rate) => {
    expect(() => getWithdrawalRate(rate)).toThrow(RangeError);
  });

  it("a tabela tem uma retirada para cada cenário oferecido, e só para eles", () => {
    expect(Object.keys(WITHDRAWAL_RATE_BP).map(Number)).toEqual([...ANNUAL_RATES]);
  });
});

describe("targetCents", () => {
  it("R$ 10.000,00 de renda dá alvo de R$ 1.500.000,00", () => {
    expect(targetCents(1_000_000, 800)).toBe(150_000_000);
  });

  it("R$ 0,01 de renda dá R$ 1,50", () => {
    expect(targetCents(1, 800)).toBe(150);
  });
});

describe("progressBp", () => {
  const target = 150_000_000;

  it("R$ 150.000,00 de R$ 1.500.000,00 é 10,0% (1000 pb)", () => {
    expect(progressBp(15_000_000, target)).toBe(1000);
  });

  it("guardado zero dá 0", () => {
    expect(progressBp(0, target)).toBe(0);
  });

  it("guardado acima do alvo passa de 10000, sem teto", () => {
    expect(progressBp(180_000_000, target)).toBe(12_000);
  });

  it("arredonda para o ponto-base mais próximo", () => {
    expect(progressBp(1, 3)).toBe(3333);
    expect(progressBp(2, 3)).toBe(6667);
  });
});

describe("ageOn", () => {
  it("antes do aniversário ainda não completou o ano", () => {
    expect(ageOn("1990-06-15", { year: 2026, month: 6, day: 14 })).toBe(35);
    expect(ageOn("1990-06-15", { year: 2026, month: 5, day: 30 })).toBe(35);
  });

  it("no dia do aniversário e depois completou o ano", () => {
    expect(ageOn("1990-06-15", { year: 2026, month: 6, day: 15 })).toBe(36);
    expect(ageOn("1990-06-15", { year: 2026, month: 12, day: 31 })).toBe(36);
  });

  it("nascimento em 29/02 faz aniversário em 28/02 em ano não bissexto", () => {
    expect(ageOn("2000-02-29", { year: 2025, month: 2, day: 27 })).toBe(24);
    expect(ageOn("2000-02-29", { year: 2025, month: 2, day: 28 })).toBe(25);
  });

  it("nascimento em 29/02 faz aniversário em 29/02 em ano bissexto", () => {
    expect(ageOn("2000-02-29", { year: 2028, month: 2, day: 28 })).toBe(27);
    expect(ageOn("2000-02-29", { year: 2028, month: 2, day: 29 })).toBe(28);
  });
});

describe("monthsUntilRetirement", () => {
  it("conta meses de calendário até o mês do aniversário de aposentadoria", () => {
    // aposenta em 2046-06; hoje 2026-06 → 240 meses
    expect(monthsUntilRetirement("1986-06-15", 60, { year: 2026, month: 6 })).toBe(240);
    // hoje 2026-01 → 245 meses
    expect(monthsUntilRetirement("1986-06-15", 60, { year: 2026, month: 1 })).toBe(245);
    // hoje 2026-09 → 237 meses
    expect(monthsUntilRetirement("1986-06-15", 60, { year: 2026, month: 9 })).toBe(237);
  });

  it("aniversário no mês corrente dá 0, mesmo que o dia já tenha passado", () => {
    expect(monthsUntilRetirement("1966-06-01", 60, { year: 2026, month: 6 })).toBe(0);
    expect(monthsUntilRetirement("1966-06-30", 60, { year: 2026, month: 6 })).toBe(0);
  });

  it("aniversário já passado dá 0, nunca negativo", () => {
    expect(monthsUntilRetirement("1960-01-10", 60, { year: 2026, month: 6 })).toBe(0);
    expect(monthsUntilRetirement("1966-05-10", 60, { year: 2026, month: 6 })).toBe(0);
  });

  it("mês seguinte ao corrente dá 1", () => {
    expect(monthsUntilRetirement("1966-07-10", 60, { year: 2026, month: 6 })).toBe(1);
  });
});

describe("requiredMonthlyCents", () => {
  it("alvo R$ 1.500.000,00, guardado zero e 240 meses dá 263.621 centavos (R$ 2.636,21)", () => {
    expect(requiredMonthlyCents({ targetCents: 150_000_000, savedCents: 0, months: 240, annualRateBp: 800 })).toBe(263_621);
  });

  it("guardado capitalizado que já alcança o alvo dá 0", () => {
    // 100.000.000 × 1,08^20 ≈ 466.096.000 > 150.000.000
    expect(requiredMonthlyCents({ targetCents: 150_000_000, savedCents: 100_000_000, months: 240, annualRateBp: 800 })).toBe(0);
  });

  it("guardado igual ao alvo dá 0", () => {
    expect(requiredMonthlyCents({ targetCents: 150_000_000, savedCents: 150_000_000, months: 12, annualRateBp: 800 })).toBe(0);
  });

  it.each([
    { targetCents: 150_000_000, savedCents: 0, months: 240 },
    { targetCents: 150_000_000, savedCents: 20_000_000, months: 120 },
    { targetCents: 30_000_000, savedCents: 1_234_567, months: 37 },
  ])("o aporte atinge o alvo a 8%% a.a. efetivos (%j)", ({ targetCents, savedCents, months }) => {
    const payment = requiredMonthlyCents({ targetCents, savedCents, months, annualRateBp: 800 });
    const i = 1.08 ** (1 / 12) - 1;
    const growth = (1 + i) ** months;
    const future = savedCents * growth + (payment * (growth - 1)) / i;
    expect(future).toBeGreaterThanOrEqual(targetCents - 1e-3);
    // arredondado para cima: sobra menos que 1 centavo de aporte capitalizado
    expect(future - targetCents).toBeLessThan((growth - 1) / i);
  });
});

describe("summarize", () => {
  // 2026-06-15 12:00 em São Paulo
  const now = new Date("2026-06-15T15:00:00Z");

  it("devolve alvo, falta, progresso, prazo e aporte", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 15_000_000, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800 },
      now,
    );
    expect(summary).toMatchObject({
      targetCents: 150_000_000,
      savedCents: 15_000_000,
      remainingCents: 135_000_000,
      progressBp: 1000,
      months: 240,
    });
    expect(summary.monthlyCents).toBe(
      requiredMonthlyCents({ targetCents: 150_000_000, savedCents: 15_000_000, months: 240, annualRateBp: 800 }),
    );
  });

  it("guardado zero e 240 meses dá aporte de 263.621 centavos e 0 pb", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800 },
      now,
    );
    expect(summary.monthlyCents).toBe(263_621);
    expect(summary.progressBp).toBe(0);
  });

  it("guardado acima do alvo: falta 0, progresso acima de 10000 e aporte 0", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 180_000_000, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800 },
      now,
    );
    expect(summary.remainingCents).toBe(0);
    expect(summary.progressBp).toBe(12_000);
    expect(summary.monthlyCents).toBe(0);
  });

  it("months = 0 e guardado < alvo: monthlyCents nulo e falta mantida", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 15_000_000, birthDate: "1966-06-20", retirementAge: 60, annualRateBp: 800 },
      now,
    );
    expect(summary.months).toBe(0);
    expect(summary.monthlyCents).toBeNull();
    expect(summary.remainingCents).toBe(135_000_000);
  });

  it("months = 0 e guardado >= alvo: aporte 0", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 150_000_000, birthDate: "1966-06-20", retirementAge: 60, annualRateBp: 800 },
      now,
    );
    expect(summary.months).toBe(0);
    expect(summary.monthlyCents).toBe(0);
  });

  it("recalcula o prazo só com o passar do tempo (mês seguinte, 1 mês a menos)", () => {
    const goal = {
      monthlyIncomeCents: 1_000_000,
      savedCents: 0,
      birthDate: "1986-06-15",
      retirementAge: 60,
      annualRateBp: 800 as const,
    };
    expect(summarize(goal, new Date("2026-07-15T15:00:00Z")).months).toBe(239);
  });
});

describe("taxa anual como parâmetro", () => {
  it("oferece as taxas 6%, 8% e 10%, com 8% como padrão", () => {
    expect(ANNUAL_RATES).toEqual([600, 800, 1000]);
    expect(DEFAULT_ANNUAL_RATE_BP).toBe(800);
  });

  it.each([
    [600, 200_000_000],
    [800, 150_000_000],
    [1000, 120_000_000],
  ])("targetCents(R$ 10.000,00, %d pb) = %d centavos", (rate, expected) => {
    expect(targetCents(1_000_000, rate)).toBe(expected);
  });

  it.each([
    [600, 441_075],
    [800, 263_621],
    [1000, 167_071],
  ])("aporte para guardado 0 e 240 meses a %d pb = %d centavos", (rate, expected) => {
    const target = targetCents(1_000_000, rate);
    expect(requiredMonthlyCents({ targetCents: target, savedCents: 0, months: 240, annualRateBp: rate })).toBe(expected);
  });

  it.each([[600], [800], [1000]])("guardado capitalizado que alcança o alvo dá 0 a %d pb", (rate) => {
    const target = targetCents(1_000_000, rate);
    expect(requiredMonthlyCents({ targetCents: target, savedCents: target, months: 12, annualRateBp: rate })).toBe(0);
  });

  it("monthlyRate(800) é 1,08^(1/12) − 1", () => {
    expect(Math.abs(monthlyRate(800) - (1.08 ** (1 / 12) - 1))).toBeLessThan(1e-12);
  });
});

describe("summarize por taxa", () => {
  // 2026-06-15 em São Paulo; nascido em 1986-06-15, aposenta aos 60: 240 meses.
  const now = new Date("2026-06-15T15:00:00Z");
  const goal = { monthlyIncomeCents: 1_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60 };

  it.each([
    [600, 200_000_000, 441_075],
    [800, 150_000_000, 263_621],
    [1000, 120_000_000, 167_071],
  ] as const)("taxa %d pb: alvo %d e aporte %d centavos", (annualRateBp, target, monthly) => {
    const summary = summarize({ ...goal, annualRateBp }, now);
    expect(summary.months).toBe(240);
    expect(summary.targetCents).toBe(target);
    expect(summary.monthlyCents).toBe(monthly);
  });

  it("devolve a renda e a taxa do objetivo", () => {
    const summary = summarize({ ...goal, monthlyIncomeCents: 2_000_000, annualRateBp: 1000 }, now);
    expect(summary.monthlyIncomeCents).toBe(2_000_000);
    expect(summary.annualRateBp).toBe(1000);
  });
});

describe("projectTimeline", () => {
  // renda R$ 10.000,00, guardado 0, 8%, 240 meses, aposentadoria aos 60
  const base = { savedCents: 0, months: 240, monthlyCents: 263_621, retirementAge: 60, annualRateBp: 800 };

  it("último ponto: total R$ 1.500.001,04, investido R$ 632.690,40 e rendimentos R$ 867.310,64", () => {
    const last = projectTimeline(base).at(-1);
    expect(last).toMatchObject({
      months: 240,
      totalCents: 150_000_104,
      investedCents: 63_269_040,
      interestCents: 86_731_064,
    });
  });

  it("participação dos rendimentos no último ponto é 58%", () => {
    expect(interestSharePct(projectTimeline(base))).toBe(58);
  });

  it("pontos a cada 12 meses a partir de hoje, mais o ponto final (21 pontos em 240 meses)", () => {
    const months = projectTimeline(base).map((p) => p.months);
    expect(months).toHaveLength(21);
    expect(months.slice(0, 3)).toEqual([0, 12, 24]);
    expect(months.slice(-2)).toEqual([228, 240]);
  });

  it("prazo de 18 meses: pontos em 0, 12 e 18", () => {
    expect(projectTimeline({ ...base, months: 18 }).map((p) => p.months)).toEqual([0, 12, 18]);
  });

  it("prazo de 12 meses: pontos em 0 e 12, sem duplicar", () => {
    expect(projectTimeline({ ...base, months: 12 }).map((p) => p.months)).toEqual([0, 12]);
  });

  it("prazo menor que 12 meses: só o ponto inicial e o final", () => {
    expect(projectTimeline({ ...base, months: 5 }).map((p) => p.months)).toEqual([0, 5]);
  });

  it("investido = guardado + aporte × meses e rendimentos = total − investido, nunca negativo", () => {
    const points = projectTimeline({ ...base, savedCents: 15_000_000 });
    for (const point of points) {
      expect(point.investedCents).toBe(15_000_000 + 263_621 * point.months);
      expect(point.interestCents).toBe(point.totalCents - point.investedCents);
      expect(point.interestCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("idade em anos completos = aposentadoria − ⌈(prazo − meses) ÷ 12⌉; o ponto final é a idade de aposentadoria", () => {
    const points = projectTimeline(base);
    expect(points[0].ageYears).toBe(40);
    expect(points.at(-1)?.ageYears).toBe(60);
    const short = projectTimeline({ ...base, months: 18 });
    expect(short.map((p) => p.ageYears)).toEqual([58, 59, 60]);
  });

  it("idade do eixo = aposentadoria − (prazo − meses) ÷ 12", () => {
    const short = projectTimeline({ ...base, months: 18 });
    expect(short.map((p) => p.age)).toEqual([58.5, 59.5, 60]);
  });

  it("prazo 0: linha do tempo vazia e participação nula", () => {
    const empty = projectTimeline({ ...base, months: 0, monthlyCents: null });
    expect(empty).toEqual([]);
    expect(interestSharePct(empty)).toBeNull();
  });

  it("aporte 0: investido constante e todo o crescimento em rendimentos", () => {
    const points = projectTimeline({ ...base, savedCents: 200_000_000, monthlyCents: 0, months: 36 });
    expect(points.every((p) => p.investedCents === 200_000_000)).toBe(true);
    expect(points.at(-1)?.interestCents).toBe(points.at(-1)!.totalCents - 200_000_000);
    expect(points.at(-1)!.interestCents).toBeGreaterThan(0);
  });

  it("summarize inclui a linha do tempo e a participação dos rendimentos", () => {
    const goal = {
      monthlyIncomeCents: 1_000_000,
      savedCents: 0,
      birthDate: "1986-06-15",
      retirementAge: 60,
      annualRateBp: 800 as const,
    };
    const summary = summarize(goal, new Date("2026-06-15T15:00:00Z"));
    expect(summary.timeline).toHaveLength(21);
    expect(summary.timeline.at(-1)?.totalCents).toBe(150_000_104);
    expect(summary.interestSharePct).toBe(58);
  });

  it("summarize sem prazo: linha do tempo vazia", () => {
    const goal = {
      monthlyIncomeCents: 1_000_000,
      savedCents: 15_000_000,
      birthDate: "1966-06-20",
      retirementAge: 60,
      annualRateBp: 800 as const,
    };
    const summary = summarize(goal, new Date("2026-06-15T15:00:00Z"));
    expect(summary.timeline).toEqual([]);
    expect(summary.interestSharePct).toBeNull();
  });
});

describe("buildCheckpoints", () => {
  // 2026-06-15 em São Paulo; nascido em 1986-06-15, aposenta aos 60: 240 meses; renda R$ 10.000,00 a 8%
  const now = new Date("2026-06-15T15:00:00Z");
  const goal: Goal = {
    monthlyIncomeCents: 1_000_000,
    savedCents: 0,
    birthDate: "1986-06-15",
    retirementAge: 60,
    annualRateBp: 800,
  };
  const checkpointsOf = (override: Partial<Goal> = {}, at = now) =>
    summarize({ ...goal, ...override }, at).checkpoints;

  it("alvo R$ 1.500.000,00: valores de 25%, 50%, 75% e 100% do alvo", () => {
    expect(checkpointsOf().map((c) => c.valueCents)).toEqual([37_500_000, 75_000_000, 112_500_000, 150_000_000]);
  });

  it("posição na barra igual à fração do alvo em pontos-base", () => {
    expect(checkpointsOf().map((c) => c.positionBp)).toEqual([2500, 5000, 7500, 10_000]);
    expect(checkpointsOf().map((c) => c.fractionBp)).toEqual([2500, 5000, 7500, 10_000]);
  });

  it("guardado 0, 8%, 240 meses, aposentadoria aos 60: previsão nos meses 102, 163, 206 e 240", () => {
    expect(checkpointsOf().map((c) => c.months)).toEqual([102, 163, 206, 240]);
  });

  it("idade da previsão: 48, 53, 57 e 60 anos", () => {
    expect(checkpointsOf().map((c) => c.ageYears)).toEqual([48, 53, 57, 60]);
    expect(checkpointsOf().every((c) => !c.reached)).toBe(true);
  });

  it("guardado R$ 400.000,00: 25% atingido sem previsão; os demais com previsão", () => {
    const [quarter, half, three, full] = checkpointsOf({ savedCents: 40_000_000 });
    expect(quarter).toMatchObject({ reached: true, months: null, ageYears: null });
    expect(half.reached).toBe(false);
    expect(half.months).toEqual(expect.any(Number));
    expect(three.ageYears).toEqual(expect.any(Number));
    expect(full).toMatchObject({ reached: false, months: 240, ageYears: 60 });
  });

  it("guardado igual ao alvo: os 4 atingidos", () => {
    const all = checkpointsOf({ savedCents: 150_000_000 });
    expect(all.map((c) => c.reached)).toEqual([true, true, true, true]);
    expect(all.every((c) => c.months === null && c.ageYears === null)).toBe(true);
  });

  it("prazo 0 e guardado abaixo do alvo: sem previsão nos não atingidos", () => {
    const ended = checkpointsOf({ savedCents: 15_000_000, birthDate: "1966-06-20" });
    expect(ended.every((c) => !c.reached)).toBe(true);
    expect(ended.every((c) => c.months === null && c.ageYears === null)).toBe(true);
  });

  it.each([[600], [800], [1000]] as const)("o checkpoint de 100%% prevê no prazo (240 meses, 60 anos) a %d pb", (annualRateBp) => {
    const full = checkpointsOf({ annualRateBp }).at(-1);
    expect(full).toMatchObject({ months: 240, ageYears: 60, fractionBp: 10_000 });
  });

  it("os valores seguem o alvo da taxa: R$ 10.000,00 a 6% dá checkpoints de R$ 500.000,00 e 2.000.000,00", () => {
    const values = checkpointsOf({ annualRateBp: 600 }).map((c) => c.valueCents);
    expect(values[0]).toBe(50_000_000);
    expect(values[3]).toBe(200_000_000);
  });
});

describe("compositionShares", () => {
  it("R$ 1.130.000,00 investidos de R$ 2.170.000,00 dão 52% e 48%", () => {
    expect(compositionShares(113_000_000, 217_000_000)).toEqual({ investedPct: 52, interestPct: 48 });
  });

  it("arredonda o investido (1 de 8 = 12,5% → 13) e os rendimentos fecham em 100", () => {
    expect(compositionShares(1, 8)).toEqual({ investedPct: 13, interestPct: 87 });
  });

  it("tudo investido dá 100% e 0%", () => {
    expect(compositionShares(500_000, 500_000)).toEqual({ investedPct: 100, interestPct: 0 });
  });

  it("patrimônio zerado não tem percentuais", () => {
    expect(compositionShares(0, 0)).toBeNull();
  });
});

describe("chartYMax", () => {
  it("alvo e final de R$ 3.000.000,00 dão teto de R$ 3.210.000,00", () => {
    expect(chartYMax(300_000_000, 300_000_000)).toBe(321_000_000);
  });

  it("patrimônio final acima do alvo define o teto", () => {
    expect(chartYMax(300_000_000, 400_000_000)).toBe(428_000_000);
  });

  it("alvo acima do patrimônio final define o teto", () => {
    expect(chartYMax(300_000_000, 100_000_000)).toBe(321_000_000);
  });

  it("devolve centavos inteiros, arredondando (R$ 3.012.345,67 × 107% = R$ 3.223.209,87)", () => {
    expect(chartYMax(5, 0)).toBe(5);
    expect(chartYMax(301_234_567, 0)).toBe(322_320_987);
  });
});
