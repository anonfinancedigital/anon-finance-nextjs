import { describe, expect, it } from "vitest";
import { summarize, type Checkpoint } from "./freedom";
import { formatCompactBRL } from "./money";
import {
  ADJUST_LABEL,
  assumptionChips,
  checkpointLabel,
  DEPOSIT_LABEL,
  depositDelta,
  depositText,
  DRAWER_INTRO,
  formatRate,
  formatTerm,
  HOW_DISCLAIMER,
  HOW_TITLE,
  howWeCalculate,
  incomeHeadline,
  interestBadge,
  RATE_HINT,
  RATE_TITLE,
  scenarioName,
  SUBTITLE,
  summarySentence,
  TARGET_LABEL,
  TODAY_TOOLTIP,
  todayLabel,
  WITHDRAWAL_EXPLANATION,
  withdrawalTooltip,
} from "./freedom-copy";

const normalize = (s: string) => s.replace(/\s/g, " ");

// 2026-06-15 em São Paulo; renda R$ 20.000,00, guardado 0, ápice aos 60 (240 meses).
const now = new Date("2026-06-15T15:00:00Z");
const goal = { monthlyIncomeCents: 2_000_000, savedCents: 0, birthDate: "1986-06-15", retirementAge: 60 };

// Cenário de aceite: renda R$ 20.000,00, guardado R$ 565.000,00, 8% real, retirada 5%, ápice aos 48
// (179 meses = 14 anos e 11 meses a partir de 2026-06).
const acceptance = summarize(
  { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
  now,
);

describe("rótulos do seletor", () => {
  it("título e legenda da rentabilidade real", () => {
    expect(RATE_TITLE).toBe("Rentabilidade real esperada");
    expect(RATE_HINT).toBe("Taxa real estimada (descontada a inflação)");
  });
});

describe("sem promessa de renda ou retorno", () => {
  const FORBIDDEN = ["segur", "perpétu", "garantid", "vitalíc", "consumir", "principal", "vai gerar"];
  const texts = [
    RATE_TITLE,
    RATE_HINT,
    howWeCalculate(acceptance),
    SUBTITLE,
    DRAWER_INTRO,
    ADJUST_LABEL,
    DEPOSIT_LABEL,
    TARGET_LABEL,
    incomeHeadline(acceptance),
    summarySentence(acceptance),
    depositText(acceptance),
  ];

  it.each(FORBIDDEN)("nenhum texto contém \"%s\"", (root) => {
    for (const t of texts) expect(normalize(t).toLowerCase()).not.toContain(root);
  });

  // O aviso nega a garantia ("não representam garantia"); só "garantid" fica de fora.
  it.each(FORBIDDEN.filter((root) => root !== "garantid"))("o aviso do popover não contém \"%s\"", (root) => {
    expect(HOW_DISCLAIMER.toLowerCase()).not.toContain(root);
  });
});

describe("nomenclatura sem os termos antigos", () => {
  const OLD_TERMS = ["Aporte Estratégico", "Meta Patrimonial", "Calibrar Parâmetros", "Simule o ápice"];
  const texts = [
    RATE_TITLE,
    RATE_HINT,
    HOW_TITLE,
    HOW_DISCLAIMER,
    howWeCalculate(acceptance),
    SUBTITLE,
    DRAWER_INTRO,
    ADJUST_LABEL,
    DEPOSIT_LABEL,
    TARGET_LABEL,
    incomeHeadline(acceptance),
    summarySentence(acceptance),
    depositText(acceptance),
  ];

  it.each(OLD_TERMS)("nenhum texto contém \"%s\"", (term) => {
    for (const t of texts) expect(normalize(t)).not.toContain(term);
  });
});

describe("hierarquia e nomenclatura", () => {
  it("subtítulo, descrição da gaveta e rótulos exatos", () => {
    expect(SUBTITLE).toBe("Quanto você precisa juntar para viver de renda — e quanto guardar por mês para chegar lá.");
    expect(DRAWER_INTRO).toBe("Altere os valores e veja o aporte mensal mudar na hora.");
    expect(ADJUST_LABEL).toBe("Ajustar objetivo");
    expect(DEPOSIT_LABEL).toBe("Aporte mensal necessário");
    expect(TARGET_LABEL).toBe("Patrimônio necessário");
  });
});

describe("incomeHeadline", () => {
  it("cenário de aceite: R$ 20 mil/mês aos 48 anos", () => {
    expect(normalize(incomeHeadline(acceptance))).toBe("R$ 20 mil/mês aos 48 anos");
  });

  it("outra renda e outra idade mudam o texto", () => {
    const other = summarize(
      { monthlyIncomeCents: 1_500_000, savedCents: 0, birthDate: "1993-05-10", retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(normalize(incomeHeadline(other))).toBe("R$ 15 mil/mês aos 55 anos");
  });
});

describe("summarySentence", () => {
  it("cenário de aceite: renda, patrimônio, aporte e prazo", () => {
    expect(acceptance.monthlyCents).toBe(902_719);
    expect(normalize(summarySentence(acceptance))).toBe(
      "Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Isso exige guardar R$ 9.027/mês por 14 anos e 11 meses.",
    );
  });

  it("muda com a renda e com a idade", () => {
    const other = summarize(
      { monthlyIncomeCents: 1_500_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    const sentence = normalize(summarySentence(other));
    expect(sentence).toContain("Para ter R$ 15 mil/mês aos 55 anos, você precisa de R$ 3,6 mi.");
    expect(sentence).toContain(`Isso exige guardar ${normalize(depositText(other))} por 21 anos e 11 meses.`);
    expect(sentence).not.toBe(normalize(summarySentence(acceptance)));
  });

  it("prazo encerrado: termina em \"você precisa de R$ 4,8 mi.\" sem a cláusula", () => {
    const ended = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1978-06-20", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(ended.monthlyCents).toBeNull();
    const sentence = normalize(summarySentence(ended));
    expect(sentence).toBe("Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi.");
    expect(sentence).not.toContain("Isso exige guardar");
  });

  it("meta já alcançada: usa \"Você já tem o necessário.\" no lugar da cláusula", () => {
    const reached = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 500_000_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(reached.monthlyCents).toBe(0);
    const sentence = normalize(summarySentence(reached));
    expect(sentence).toBe("Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Você já tem o necessário.");
    expect(sentence).not.toContain("Isso exige guardar");
  });
});

describe("depositText", () => {
  it("aporte vira reais inteiros por mês", () => {
    expect(normalize(depositText(acceptance))).toBe("R$ 9.027/mês");
  });

  it("prazo encerrado (aporte nulo) vira Prazo encerrado", () => {
    const ended = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1978-06-20", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(depositText(ended)).toBe("Prazo encerrado");
  });

  it("meta alcançada (aporte 0) vira Meta alcançada", () => {
    const reached = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 500_000_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(depositText(reached)).toBe("Meta alcançada");
  });
});

describe("assumptionChips e scenarioName", () => {
  const withRates = (annualRateBp: number, withdrawalRateBp: number) =>
    summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp, withdrawalRateBp },
      now,
    );

  it("8% e 5%: cenário moderado e as premissas ativas", () => {
    expect(scenarioName(acceptance)).toBe("moderado");
    expect(assumptionChips(acceptance)).toEqual({
      scenario: "Cenário moderado",
      rate: "8% real a.a.",
      withdrawal: "Retirada de 5% a.a.",
      today: "Valores em R$ de hoje",
    });
  });

  it("6% e 4%: Cenário conservador", () => {
    const summary = withRates(600, 400);
    expect(assumptionChips(summary)).toMatchObject({
      scenario: "Cenário conservador",
      rate: "6% real a.a.",
      withdrawal: "Retirada de 4% a.a.",
    });
  });

  it("10% e 6%: Cenário agressivo", () => {
    const summary = withRates(1000, 600);
    expect(assumptionChips(summary)).toMatchObject({
      scenario: "Cenário agressivo",
      rate: "10% real a.a.",
      withdrawal: "Retirada de 6% a.a.",
    });
  });

  it("par fora dos presets: Cenário personalizado com as taxas digitadas", () => {
    const summary = withRates(650, 450);
    expect(scenarioName(summary)).toBe("personalizado");
    expect(assumptionChips(summary)).toEqual({
      scenario: "Cenário personalizado",
      rate: "6,5% real a.a.",
      withdrawal: "Retirada de 4,5% a.a.",
      today: "Valores em R$ de hoje",
    });
  });

  it("rentabilidade de um preset com retirada diferente também é personalizado", () => {
    const summary = withRates(800, 600);
    expect(assumptionChips(summary).scenario).toBe("Cenário personalizado");
  });
});

describe("textos dos tooltips das premissas", () => {
  it("tooltip do chip R$ de hoje (APICE-04.4)", () => {
    expect(TODAY_TOOLTIP).toBe("Todos os valores já descontam a inflação.");
  });

  it("explicação da retirada, usada sozinha quando ainda não há resumo", () => {
    expect(WITHDRAWAL_EXPLANATION).toBe("Percentual do patrimônio que você saca por ano para gerar sua renda.");
  });
});

describe("premissas sem resumo (APICE-19.3)", () => {
  it("assumptionChips e scenarioName aceitam só o par de taxas", () => {
    expect(scenarioName({ annualRateBp: 600, withdrawalRateBp: 400 })).toBe("conservador");
    expect(assumptionChips({ annualRateBp: 1000, withdrawalRateBp: 600 })).toEqual({
      scenario: "Cenário agressivo",
      rate: "10% real a.a.",
      withdrawal: "Retirada de 6% a.a.",
      today: "Valores em R$ de hoje",
    });
  });
});

describe("withdrawalTooltip", () => {
  it("cenário de aceite: 5% sobre R$ 4,8 mi geram R$ 240 mil/ano (R$ 20 mil/mês)", () => {
    const text = withdrawalTooltip({
      withdrawalBp: acceptance.withdrawalRateBp,
      targetCents: acceptance.targetCents,
      monthlyIncomeCents: acceptance.monthlyIncomeCents,
    });
    expect(normalize(text)).toBe(
      "Percentual do patrimônio que você saca por ano para gerar sua renda. Com 5%, R$ 4,8 mi geram R$ 240 mil/ano (R$ 20 mil/mês).",
    );
  });

  it("usa os valores dados: retirada, patrimônio e renda diferentes mudam o texto", () => {
    const text = withdrawalTooltip({ withdrawalBp: 650, targetCents: 200_000_000, monthlyIncomeCents: 1_000_000 });
    expect(normalize(text)).toBe(
      "Percentual do patrimônio que você saca por ano para gerar sua renda. Com 6,5%, R$ 2 mi geram R$ 120 mil/ano (R$ 10 mil/mês).",
    );
  });
});

describe("todayLabel", () => {
  it("cenário de aceite: Hoje · R$ 565 mil (11,8%) · 33 anos", () => {
    expect(normalize(todayLabel(acceptance))).toBe("Hoje · R$ 565 mil (11,8%) · 33 anos");
  });

  it("progresso acima de 100% mostra o percentual real", () => {
    const above = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 600_000_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(normalize(todayLabel(above))).toBe("Hoje · R$ 6 mi (125,0%) · 33 anos");
  });
});

describe("depositDelta", () => {
  it("aumento: seta para cima e a diferença em reais inteiros", () => {
    expect(depositDelta(1_026_700, 902_700)).toEqual({ direction: "up", text: expect.any(String) });
    expect(normalize(depositDelta(1_026_700, 902_700)!.text)).toBe("R$ 1.240 vs. atual");
  });

  it("redução: seta para baixo e a diferença sem sinal", () => {
    const delta = depositDelta(902_700, 1_026_700);
    expect(delta?.direction).toBe("down");
    expect(normalize(delta!.text)).toBe("R$ 1.240 vs. atual");
  });

  it("aportes iguais não têm variação", () => {
    expect(depositDelta(902_719, 902_719)).toBeNull();
    expect(depositDelta(0, 0)).toBeNull();
  });

  it("lado nulo não tem variação", () => {
    expect(depositDelta(null, 902_719)).toBeNull();
    expect(depositDelta(902_719, null)).toBeNull();
    expect(depositDelta(null, null)).toBeNull();
  });

  it("diferença menor que R$ 1 não mostra variação em reais inteiros", () => {
    expect(depositDelta(902_719, 902_700)).toBeNull();
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

describe("howWeCalculate", () => {
  it("renda R$ 20.000, retirada inicial de 5% e meta R$ 4.800.000", () => {
    expect(acceptance.targetCents).toBe(480_000_000);
    expect(normalize(howWeCalculate(acceptance))).toBe(
      "Com uma renda de R$ 20.000,00/mês (R$ 240.000,00/ano) e uma taxa de retirada inicial de 5% a.a., o patrimônio-alvo é de R$ 4.800.000,00.",
    );
  });

  it("retirada de 650 pb sai com vírgula decimal", () => {
    const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 650 }, now);
    expect(howWeCalculate(summary)).toContain("taxa de retirada inicial de 6,5% a.a.");
  });

  it("título e aviso do popover", () => {
    expect(HOW_TITLE).toBe("Como chegamos a esse número:");
    expect(HOW_DISCLAIMER).toBe(
      "A simulação utiliza rentabilidade real, já descontada da inflação. Os valores são projeções e não representam garantia de rentabilidade ou de renda futura.",
    );
  });
});

describe("formatTerm", () => {
  it.each([
    [14, "1 ano e 2 meses"],
    [36, "3 anos"],
    [5, "5 meses"],
    [0, "0 meses"],
  ])("%d meses vira %s", (months, text) => {
    expect(formatTerm(months)).toBe(text);
  });
});

describe("interestBadge", () => {
  const expected = (summary: ReturnType<typeof summarize>) =>
    `${normalize(formatCompactBRL(summary.timeline.at(-1)!.interestCents))} vêm dos rendimentos · ${summary.interestSharePct}% do patrimônio final`;

  it("cenário de aceite: rendimentos do último ponto e participação no patrimônio final", () => {
    const badge = interestBadge(acceptance);
    expect(badge).not.toBeNull();
    expect(normalize(badge!)).toBe(expected(acceptance));
    expect(normalize(badge!)).toBe("R$ 2,6 mi vêm dos rendimentos · 55% do patrimônio final");
  });

  it("outro prazo muda o valor e o percentual", () => {
    const later = summarize(
      { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, birthDate: "1993-05-10", retirementAge: 55, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    const badge = normalize(interestBadge(later)!);
    expect(badge).toBe(expected(later));
    expect(later.interestSharePct).not.toBe(acceptance.interestSharePct);
    expect(later.timeline.at(-1)!.interestCents).not.toBe(acceptance.timeline.at(-1)!.interestCents);
    expect(badge).not.toBe(normalize(interestBadge(acceptance)!));
  });

  it("sem percentual: só o valor, sem separador", () => {
    const badge = interestBadge({ ...acceptance, interestSharePct: null });
    expect(normalize(badge!)).toBe(
      `${normalize(formatCompactBRL(acceptance.timeline.at(-1)!.interestCents))} vêm dos rendimentos`,
    );
    expect(badge).not.toContain(" · ");
  });

  it("sem linha do tempo: nenhum texto", () => {
    const summary = summarize(
      { ...goal, savedCents: 56_500_000, birthDate: "1978-06-20", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.timeline).toEqual([]);
    expect(interestBadge(summary)).toBeNull();
  });
});
