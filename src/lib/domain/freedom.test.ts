import { describe, expect, it } from "vitest";
import {
  ageOn,
  annualIncomeCents,
  chartYAxis,
  compositionShares,
  DEFAULT_ANNUAL_RATE_BP,
  DEFAULT_WITHDRAWAL_RATE_BP,
  interestSharePct,
  monthlyRate,
  presetFor,
  PRESET_RATES,
  projectTimeline,
  monthsUntilRetirement,
  progressBp,
  projectedCents,
  requiredMonthlyCents,
  summarize,
  targetCents,
} from "./freedom";
import type { Goal } from "./freedom";

describe("PRESET_RATES e presetFor", () => {
  it("os presets são 6% → retirada 4%, 8% → 5% e 10% → 6%", () => {
    expect(PRESET_RATES).toEqual([
      { annualBp: 600, withdrawalBp: 400 },
      { annualBp: 800, withdrawalBp: 500 },
      { annualBp: 1000, withdrawalBp: 600 },
    ]);
  });

  it.each([
    [600, 400, 600],
    [800, 500, 800],
    [1000, 600, 1000],
  ])("o par (%d, %d) é o preset %d", (annualBp, withdrawalBp, expected) => {
    expect(presetFor(annualBp, withdrawalBp)).toBe(expected);
  });

  it.each([
    [650, 450],
    [600, 500],
    [700, 600],
    [800, 400],
    [800, 600],
    [1000, 700],
  ])("o par (%d, %d) não coincide com nenhum preset", (annualBp, withdrawalBp) => {
    expect(presetFor(annualBp, withdrawalBp)).toBeNull();
  });
});

describe("targetCents", () => {
  it("R$ 10.000,00 de renda com retirada de 6% dá alvo de R$ 2.000.000,00", () => {
    expect(targetCents(1_000_000, 600)).toBe(200_000_000);
  });

  it("R$ 0,01 de renda com retirada de 6% dá R$ 2,00", () => {
    expect(targetCents(1, 600)).toBe(200);
  });

  it.each([
    [400, 600_000_000],
    [600, 400_000_000],
    [700, 342_857_143],
  ])("R$ 20.000,00/mês com retirada de %d pb dá alvo de %d centavos", (rate, expected) => {
    expect(targetCents(2_000_000, rate)).toBe(expected);
  });

  it("R$ 20.000,00/mês com retirada de 4,5% dá R$ 5.333.333,33", () => {
    expect(targetCents(2_000_000, 450)).toBe(533_333_333);
  });

  it("com retirada de 4% a meta não é renda × 12 ÷ rentabilidade de 6% (R$ 4.000.000,00)", () => {
    expect(targetCents(2_000_000, 400)).not.toBe(400_000_000);
  });

  it("renda máxima R$ 1.000.000,00 com retirada de 7% dá R$ 171.428.571,43, a no máximo 1 centavo do valor exato", () => {
    const target = targetCents(100_000_000, 700);
    expect(target).toBe(17_142_857_143);
    // valor exato: 1.200.000.000 × 10.000 ÷ 700; |meta × 700 − 12 × 10^12| ≤ 700 equivale a ≤ 1 centavo
    expect(Math.abs(target * 700 - 12_000_000_000_000)).toBeLessThanOrEqual(700);
  });

  it("annualIncomeCents(R$ 20.000,00) = R$ 240.000,00", () => {
    expect(annualIncomeCents(2_000_000)).toBe(24_000_000);
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

describe("chartYAxis", () => {
  const reais = (n: number) => n * 100;

  it("meta de R$ 500 mil: ticks de 100 em 100 mil até 500 mil", () => {
    expect(chartYAxis(reais(500_000), reais(500_000))).toEqual({
      max: reais(500_000),
      ticks: [0, 100_000, 200_000, 300_000, 400_000, 500_000].map(reais),
    });
  });

  it("meta de R$ 4,8 mi com patrimônio final até 4,8 mi: ticks de 1 em 1 mi até 5 mi", () => {
    expect(chartYAxis(reais(4_800_000), reais(4_800_000))).toEqual({
      max: reais(5_000_000),
      ticks: [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000].map(reais),
    });
    expect(chartYAxis(reais(4_800_000), reais(4_700_000)).max).toBe(reais(5_000_000));
  });

  it("meta de R$ 20 mi: ticks de 5 em 5 mi até 20 mi", () => {
    expect(chartYAxis(reais(20_000_000), reais(20_000_000))).toEqual({
      max: reais(20_000_000),
      ticks: [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000].map(reais),
    });
  });

  it("patrimônio final maior que a meta define o máximo", () => {
    expect(chartYAxis(reais(500_000), reais(650_000))).toEqual({
      max: reais(800_000),
      ticks: [0, 200_000, 400_000, 600_000, 800_000].map(reais),
    });
  });

  it("um centavo acima de 5 passos sobe para o próximo passo", () => {
    expect(chartYAxis(reais(500_000) + 1, reais(100))).toEqual({
      max: reais(600_000),
      ticks: [0, 200_000, 400_000, 600_000].map(reais),
    });
  });

  describe("com o patrimônio final real de summarize (APICE-08.2, 08.4)", () => {
    const now = new Date("2026-07-15T15:00:00Z");
    const scenario = (monthlyIncomeCents: number) =>
      summarize(
        { monthlyIncomeCents, savedCents: 0, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 600, withdrawalRateBp: 600 },
        now,
      );
    const axisOf = (summary: ReturnType<typeof summarize>) =>
      chartYAxis(summary.targetCents, summary.timeline[summary.timeline.length - 1].totalCents);

    it("meta de R$ 500 mil: o final passa a meta por centavos e os ticks seguem 0 a 500 mil", () => {
      const summary = scenario(reais(2_500));
      expect(summary.targetCents).toBe(reais(500_000));
      const final = summary.timeline[summary.timeline.length - 1].totalCents;
      expect(final).toBeGreaterThan(summary.targetCents);
      expect(axisOf(summary)).toEqual({
        max: reais(500_000),
        ticks: [0, 100_000, 200_000, 300_000, 400_000, 500_000].map(reais),
      });
    });

    it("meta de R$ 20 mi: o final passa a meta por centavos e os ticks seguem 0 a 20 mi", () => {
      const summary = scenario(reais(100_000));
      expect(summary.targetCents).toBe(reais(20_000_000));
      const final = summary.timeline[summary.timeline.length - 1].totalCents;
      expect(final).toBeGreaterThan(summary.targetCents);
      expect(axisOf(summary)).toEqual({
        max: reais(20_000_000),
        ticks: [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000].map(reais),
      });
    });

    it("excesso de até 0,1% da meta é ignorado; acima disso o final define o máximo", () => {
      expect(chartYAxis(reais(500_000), reais(500_000) + reais(500)).max).toBe(reais(500_000));
      expect(chartYAxis(reais(500_000), reais(500_000) + reais(500) + 1).max).toBe(reais(600_000));
    });
  });

  it("de 50 mil a 50 mi: de 4 a 6 ticks igualmente espaçados, começando em 0 e cobrindo o maior valor", () => {
    for (let raw = reais(50_000); raw <= reais(50_000_000); raw = Math.ceil(raw * 1.07)) {
      const { max, ticks } = chartYAxis(raw, Math.round(raw / 2));
      expect(ticks.length, `raw ${raw}`).toBeGreaterThanOrEqual(4);
      expect(ticks.length, `raw ${raw}`).toBeLessThanOrEqual(6);
      expect(ticks[0]).toBe(0);
      expect(ticks.at(-1)).toBe(max);
      expect(max).toBeGreaterThanOrEqual(raw);
      const step = ticks[1] - ticks[0];
      expect(ticks.every((t, i) => t === i * step), `raw ${raw}`).toBe(true);
      expect(max - step, `raw ${raw}`).toBeLessThan(raw);
    }
  });
});

describe("summarize", () => {
  // 2026-06-15 12:00 em São Paulo
  const now = new Date("2026-06-15T15:00:00Z");

  it("devolve alvo, falta, progresso, prazo e aporte", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 15_000_000, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800, withdrawalRateBp: 600 },
      now,
    );
    expect(summary).toMatchObject({
      targetCents: 200_000_000,
      savedCents: 15_000_000,
      remainingCents: 185_000_000,
      progressBp: 750,
      months: 240,
    });
    expect(summary.monthlyCents).toBe(
      requiredMonthlyCents({ targetCents: 200_000_000, savedCents: 15_000_000, months: 240, annualRateBp: 800 }),
    );
  });

  it("guardado zero e 240 meses dá aporte de 351.495 centavos e 0 pb", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800, withdrawalRateBp: 600 },
      now,
    );
    expect(summary.monthlyCents).toBe(351_495);
    expect(summary.progressBp).toBe(0);
  });

  it("guardado acima do alvo: falta 0, progresso acima de 10000 e aporte 0", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 240_000_000, birthDate: "1986-06-15", retirementAge: 60, annualRateBp: 800, withdrawalRateBp: 600 },
      now,
    );
    expect(summary.remainingCents).toBe(0);
    expect(summary.progressBp).toBe(12_000);
    expect(summary.monthlyCents).toBe(0);
  });

  it("months = 0 e guardado < alvo: monthlyCents nulo e falta mantida", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 15_000_000, birthDate: "1966-06-20", retirementAge: 60, annualRateBp: 800, withdrawalRateBp: 600 },
      now,
    );
    expect(summary.months).toBe(0);
    expect(summary.monthlyCents).toBeNull();
    expect(summary.remainingCents).toBe(185_000_000);
  });

  it("months = 0 e guardado >= alvo: aporte 0", () => {
    const summary = summarize(
      { monthlyIncomeCents: 1_000_000, savedCents: 200_000_000, birthDate: "1966-06-20", retirementAge: 60, annualRateBp: 800, withdrawalRateBp: 600 },
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
      withdrawalRateBp: 600,
    };
    expect(summarize(goal, new Date("2026-07-15T15:00:00Z")).months).toBe(239);
  });

  it("expõe a idade do ápice do objetivo", () => {
    const summary = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.retirementAge).toBe(48);
  });

  it("expõe a idade atual: 33 anos no cenário de aceite", () => {
    const summary = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.currentAge).toBe(33);
  });

  it("na véspera do aniversário a idade atual ainda é a anterior", () => {
    const goal = { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-06-16", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 };
    expect(summarize(goal, now).currentAge).toBe(32);
    expect(summarize(goal, new Date("2026-06-16T15:00:00Z")).currentAge).toBe(33);
  });
});

describe("taxa anual como parâmetro", () => {
  it("oferece as taxas 6%, 8% e 10%, com 8% como padrão", () => {
    expect(PRESET_RATES.map((p) => p.annualBp)).toEqual([600, 800, 1000]);
    expect(DEFAULT_ANNUAL_RATE_BP).toBe(800);
  });

  it("a retirada padrão é a do preset moderado: 5% com 8%", () => {
    expect(DEFAULT_WITHDRAWAL_RATE_BP).toBe(500);
    expect(presetFor(DEFAULT_ANNUAL_RATE_BP, DEFAULT_WITHDRAWAL_RATE_BP)).toBe(800);
  });

  it.each([
    [400, 300_000_000],
    [600, 200_000_000],
    [700, 171_428_571],
  ])("targetCents(R$ 10.000,00, retirada %d pb) = %d centavos", (withdrawal, expected) => {
    expect(targetCents(1_000_000, withdrawal)).toBe(expected);
  });

  it.each([
    [600, 400, 661_612],
    [800, 600, 351_495],
    [1000, 700, 238_673],
  ])("aporte para guardado 0 e 240 meses a %d pb (retirada %d pb) = %d centavos", (rate, withdrawal, expected) => {
    const target = targetCents(1_000_000, withdrawal);
    expect(requiredMonthlyCents({ targetCents: target, savedCents: 0, months: 240, annualRateBp: rate })).toBe(expected);
  });

  it.each([
    [600, 400],
    [800, 600],
    [1000, 700],
  ])("guardado capitalizado que alcança o alvo dá 0 a %d pb (retirada %d pb)", (rate, withdrawal) => {
    const target = targetCents(1_000_000, withdrawal);
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
    [600, 400, 300_000_000, 661_612],
    [800, 600, 200_000_000, 351_495],
    [1000, 700, 171_428_571, 238_673],
  ] as const)("taxa %d pb e retirada %d pb: alvo %d e aporte %d centavos", (annualRateBp, withdrawalRateBp, target, monthly) => {
    const summary = summarize({ ...goal, annualRateBp, withdrawalRateBp }, now);
    expect(summary.months).toBe(240);
    expect(summary.targetCents).toBe(target);
    expect(summary.monthlyCents).toBe(monthly);
  });

  it("devolve a renda e a taxa do objetivo", () => {
    const summary = summarize({ ...goal, monthlyIncomeCents: 2_000_000, annualRateBp: 1000, withdrawalRateBp: 700 }, now);
    expect(summary.monthlyIncomeCents).toBe(2_000_000);
    expect(summary.annualRateBp).toBe(1000);
  });

  it("par personalizado 6,5% e 4,5% com renda R$ 20.000,00: meta R$ 5.333.333,33 e aporte pela rentabilidade de 6,5%", () => {
    const summary = summarize({ ...goal, monthlyIncomeCents: 2_000_000, annualRateBp: 650, withdrawalRateBp: 450 }, now);
    expect(summary.annualRateBp).toBe(650);
    expect(summary.withdrawalRateBp).toBe(450);
    expect(summary.targetCents).toBe(533_333_333);
    expect(summary.monthlyCents).toBe(
      requiredMonthlyCents({ targetCents: 533_333_333, savedCents: 0, months: 240, annualRateBp: 650 }),
    );
    expect(summary.checkpoints.at(-1)?.valueCents).toBe(533_333_333);
    expect(summary.timeline.at(-1)?.totalCents).toBe(
      projectedCents({ savedCents: 0, monthlyCents: summary.monthlyCents!, annualRateBp: 650 }, 240),
    );
  });

  it("a retirada vem do objetivo, não da rentabilidade: 8% com retirada de 5% dá meta R$ 4.800.000,00", () => {
    const summary = summarize({ ...goal, monthlyIncomeCents: 2_000_000, annualRateBp: 800, withdrawalRateBp: 500 }, now);
    expect(summary.withdrawalRateBp).toBe(500);
    expect(summary.targetCents).toBe(480_000_000);
  });
});

describe("summarize com a meta pela taxa de retirada", () => {
  // 2026-06-15 em São Paulo; nascido em 1986-06-15, aposenta aos 60: 240 meses; renda R$ 20.000,00, guardado 0.
  const now = new Date("2026-06-15T15:00:00Z");
  const goal: Goal = {
    monthlyIncomeCents: 2_000_000,
    savedCents: 0,
    birthDate: "1986-06-15",
    retirementAge: 60,
    annualRateBp: 800,
    withdrawalRateBp: 600,
  };
  const scenarios = [
    { annualRateBp: 600, withdrawalRateBp: 400, target: 600_000_000, perMonth: 0.004867551 },
    { annualRateBp: 800, withdrawalRateBp: 600, target: 400_000_000, perMonth: 0.00643403 },
    { annualRateBp: 1000, withdrawalRateBp: 700, target: 342_857_143, perMonth: 0.00797414 },
  ] as const;

  it.each(scenarios)(
    "taxa mensal de $annualRateBp pb é (1 + anual)^(1/12) − 1, nunca anual ÷ 12",
    ({ annualRateBp, perMonth }) => {
      const rate = monthlyRate(annualRateBp);
      expect(rate).toBeCloseTo(perMonth, 8);
      expect((1 + rate) ** 12).toBeCloseTo(1 + annualRateBp / 10_000, 12);
      expect(rate).not.toBeCloseTo(annualRateBp / 10_000 / 12, 6);
    },
  );

  it.each(scenarios)(
    "$annualRateBp pb: retirada $withdrawalRateBp pb, renda anual R$ 240.000,00 e meta $target centavos",
    ({ annualRateBp, withdrawalRateBp, target }) => {
      const summary = summarize({ ...goal, annualRateBp, withdrawalRateBp }, now);
      expect(summary.withdrawalRateBp).toBe(withdrawalRateBp);
      expect(summary.annualIncomeCents).toBe(24_000_000);
      expect(summary.targetCents).toBe(target);
    },
  );

  it.each(scenarios)(
    "$annualRateBp pb: o aporte leva o patrimônio à meta no prazo, com folga de no máximo 1 centavo de aporte",
    ({ annualRateBp, withdrawalRateBp, target }) => {
      const summary = summarize({ ...goal, annualRateBp, withdrawalRateBp }, now);
      const monthly = summary.monthlyCents!;
      const at = (monthlyCents: number) =>
        projectedCents({ savedCents: 0, monthlyCents, annualRateBp }, summary.months);
      expect(summary.months).toBe(240);
      expect(at(monthly)).toBeGreaterThanOrEqual(target);
      // aporte arredondado para cima ao centavo: 1 centavo a menos já não alcança a meta
      expect(at(monthly - 1)).toBeLessThan(target);
      expect(at(monthly) - target).toBeLessThanOrEqual(at(1));
      // a meta antiga (renda × 12 ÷ rentabilidade) pedia aporte menor
      const oldTarget = (2_000_000 * 12 * 10_000) / annualRateBp;
      expect(monthly).toBeGreaterThan(
        requiredMonthlyCents({ targetCents: oldTarget, savedCents: 0, months: 240, annualRateBp }),
      );
    },
  );

  it.each(scenarios)(
    "$annualRateBp pb: linha do tempo, teto do gráfico e marco de 100% usam a mesma meta",
    ({ annualRateBp, withdrawalRateBp, target }) => {
      const summary = summarize({ ...goal, annualRateBp, withdrawalRateBp }, now);
      const last = summary.timeline.at(-1)!.totalCents;
      expect(last).toBe(projectedCents({ savedCents: 0, monthlyCents: summary.monthlyCents!, annualRateBp }, 240));
      expect(last).toBeGreaterThanOrEqual(target);
      expect(last - target).toBeLessThanOrEqual(projectedCents({ savedCents: 0, monthlyCents: 1, annualRateBp }, 240));
      // o teto cobre a meta; o excesso de arredondamento do aporte (centavos) pode ficar acima do teto (APICE-08)
      const { max } = chartYAxis(summary.targetCents, last);
      expect(max).toBeGreaterThanOrEqual(target);
      expect(last - max).toBeLessThanOrEqual(target * 0.001);
      expect(summary.checkpoints.at(-1)?.valueCents).toBe(summary.targetCents);
    },
  );

  describe("recalcula só os campos que dependem da entrada alterada", () => {
    const base = summarize(goal, now);
    const pick = (s: ReturnType<typeof summarize>) => ({
      withdrawalRateBp: s.withdrawalRateBp,
      annualIncomeCents: s.annualIncomeCents,
      targetCents: s.targetCents,
      months: s.months,
      monthlyCents: s.monthlyCents,
    });

    it("base: 8%, retirada 6%, meta R$ 4.000.000,00, 240 meses", () => {
      expect(pick(base)).toMatchObject({ withdrawalRateBp: 600, annualIncomeCents: 24_000_000, targetCents: 400_000_000, months: 240 });
    });

    it("renda R$ 30.000,00: renda anual, meta e aporte sobem; retirada e prazo iguais", () => {
      const s = pick(summarize({ ...goal, monthlyIncomeCents: 3_000_000 }, now));
      expect(s).toMatchObject({ withdrawalRateBp: 600, annualIncomeCents: 36_000_000, targetCents: 600_000_000, months: 240 });
      expect(s.monthlyCents).toBeGreaterThan(base.monthlyCents!);
    });

    it("guardado R$ 500.000,00: aporte cai; meta, retirada e prazo iguais", () => {
      const s = pick(summarize({ ...goal, savedCents: 50_000_000 }, now));
      expect(s).toMatchObject({ ...pick(base), monthlyCents: s.monthlyCents });
      expect(s.monthlyCents).toBeLessThan(base.monthlyCents!);
    });

    it("nascimento em 1990-06-15: prazo de 288 meses e aporte menor; meta e retirada iguais", () => {
      const s = pick(summarize({ ...goal, birthDate: "1990-06-15" }, now));
      expect(s).toMatchObject({ ...pick(base), months: 288, monthlyCents: s.monthlyCents });
      expect(s.monthlyCents).toBeLessThan(base.monthlyCents!);
    });

    it("ápice aos 65: prazo de 300 meses e aporte menor; meta e retirada iguais", () => {
      const s = pick(summarize({ ...goal, retirementAge: 65 }, now));
      expect(s).toMatchObject({ ...pick(base), months: 300, monthlyCents: s.monthlyCents });
      expect(s.monthlyCents).toBeLessThan(base.monthlyCents!);
    });

    it("rentabilidade 6%: retirada 4%, meta R$ 6.000.000,00 e aporte maior; renda anual e prazo iguais", () => {
      const s = pick(summarize({ ...goal, annualRateBp: 600, withdrawalRateBp: 400 }, now));
      expect(s).toMatchObject({ withdrawalRateBp: 400, annualIncomeCents: 24_000_000, targetCents: 600_000_000, months: 240 });
      expect(s.monthlyCents).toBeGreaterThan(base.monthlyCents!);
    });
  });

  it("guardado R$ 1.000.000,00 que capitalizado alcança a meta de R$ 4.000.000,00: aporte 0 e progresso 25%", () => {
    // 100.000.000 × 1,08^20 ≈ 466.096.000 ≥ 400.000.000
    const summary = summarize({ ...goal, savedCents: 100_000_000 }, now);
    expect(summary.monthlyCents).toBe(0);
    expect(summary.progressBp).toBe(2500);
  });

  it("guardado acima da meta nova: progresso acima de 100% e aporte 0", () => {
    const summary = summarize({ ...goal, savedCents: 480_000_000 }, now);
    expect(summary.progressBp).toBe(12_000);
    expect(summary.monthlyCents).toBe(0);
  });

  it("prazo 0: sem alcançar a meta nova o aporte é nulo; alcançando, é 0", () => {
    const ended = { ...goal, birthDate: "1966-06-20" };
    expect(summarize({ ...ended, savedCents: 399_999_999 }, now).monthlyCents).toBeNull();
    expect(summarize({ ...ended, savedCents: 400_000_000 }, now).monthlyCents).toBe(0);
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
      withdrawalRateBp: 600,
    };
    const summary = summarize(goal, new Date("2026-06-15T15:00:00Z"));
    expect(summary.timeline).toHaveLength(21);
    expect(summary.timeline.at(-1)?.totalCents).toBe(200_000_328);
    expect(summary.interestSharePct).toBe(58);
  });

  it("summarize sem prazo: linha do tempo vazia", () => {
    const goal = {
      monthlyIncomeCents: 1_000_000,
      savedCents: 15_000_000,
      birthDate: "1966-06-20",
      retirementAge: 60,
      annualRateBp: 800 as const,
      withdrawalRateBp: 600,
    };
    const summary = summarize(goal, new Date("2026-06-15T15:00:00Z"));
    expect(summary.timeline).toEqual([]);
    expect(summary.interestSharePct).toBeNull();
  });
});

describe("buildCheckpoints", () => {
  // 2026-06-15 em São Paulo; nascido em 1986-06-15, aposenta aos 60: 240 meses; renda R$ 10.000,00 a 8% (alvo R$ 2.000.000,00)
  const now = new Date("2026-06-15T15:00:00Z");
  const goal: Goal = {
    monthlyIncomeCents: 1_000_000,
    savedCents: 0,
    birthDate: "1986-06-15",
    retirementAge: 60,
    annualRateBp: 800,
    withdrawalRateBp: 600,
  };
  const checkpointsOf = (override: Partial<Goal> = {}, at = now) =>
    summarize({ ...goal, ...override }, at).checkpoints;

  it("alvo R$ 2.000.000,00: valores de 25%, 50%, 75% e 100% do alvo", () => {
    expect(checkpointsOf().map((c) => c.valueCents)).toEqual([50_000_000, 100_000_000, 150_000_000, 200_000_000]);
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

  it("guardado R$ 500.000,00: 25% atingido sem previsão; os demais com previsão", () => {
    const [quarter, half, three, full] = checkpointsOf({ savedCents: 50_000_000 });
    expect(quarter).toMatchObject({ reached: true, months: null, ageYears: null });
    expect(half.reached).toBe(false);
    expect(half.months).toEqual(expect.any(Number));
    expect(three.ageYears).toEqual(expect.any(Number));
    expect(full).toMatchObject({ reached: false, months: 240, ageYears: 60 });
  });

  it("guardado igual ao alvo: os 4 atingidos", () => {
    const all = checkpointsOf({ savedCents: 200_000_000 });
    expect(all.map((c) => c.reached)).toEqual([true, true, true, true]);
    expect(all.every((c) => c.months === null && c.ageYears === null)).toBe(true);
  });

  it("prazo 0 e guardado abaixo do alvo: sem previsão nos não atingidos", () => {
    const ended = checkpointsOf({ savedCents: 15_000_000, birthDate: "1966-06-20" });
    expect(ended.every((c) => !c.reached)).toBe(true);
    expect(ended.every((c) => c.months === null && c.ageYears === null)).toBe(true);
  });

  it.each([
    [600, 400],
    [800, 600],
    [1000, 700],
  ] as const)("o checkpoint de 100%% prevê no prazo (240 meses, 60 anos) a %d pb (retirada %d pb)", (annualRateBp, withdrawalRateBp) => {
    const full = checkpointsOf({ annualRateBp, withdrawalRateBp }).at(-1);
    expect(full).toMatchObject({ months: 240, ageYears: 60, fractionBp: 10_000 });
  });

  it("os valores seguem o alvo da taxa: R$ 10.000,00 a 6% (retirada 4%) dá checkpoints de R$ 750.000,00 e 3.000.000,00", () => {
    const values = checkpointsOf({ annualRateBp: 600, withdrawalRateBp: 400 }).map((c) => c.valueCents);
    expect(values[0]).toBe(75_000_000);
    expect(values[3]).toBe(300_000_000);
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
