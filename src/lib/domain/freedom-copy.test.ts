import { describe, expect, it } from "vitest";
import { summarize, type Checkpoint } from "./freedom";
import { formatCompactBRL } from "./money";
import {
  checkpointLabel,
  formatRate,
  formatTerm,
  heroPill,
  HOW_DISCLAIMER,
  HOW_TITLE,
  howWeCalculate,
  interestBadge,
  PLAN_REACHED,
  planLines,
  RATE_HINT,
  RATE_TITLE,
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
  const texts = [RATE_TITLE, RATE_HINT, heroPill(acceptance), howWeCalculate(acceptance)];

  it.each(FORBIDDEN)("nenhum texto contém \"%s\"", (root) => {
    for (const t of texts) expect(normalize(t).toLowerCase()).not.toContain(root);
  });

  // O aviso nega a garantia ("não representam garantia"); só "garantid" fica de fora.
  it.each(FORBIDDEN.filter((root) => root !== "garantid"))("o aviso do popover não contém \"%s\"", (root) => {
    expect(HOW_DISCLAIMER.toLowerCase()).not.toContain(root);
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
  it("renda R$ 20.000 e retirada inicial de 5% a.a.", () => {
    expect(normalize(heroPill(acceptance))).toBe("Renda de R$ 20.000,00/mês · retirada inicial de 5% a.a.");
  });

  it("retirada de 650 pb sai com vírgula decimal", () => {
    const summary = summarize({ ...goal, annualRateBp: 800, withdrawalRateBp: 650 }, now);
    expect(normalize(heroPill(summary))).toBe("Renda de R$ 20.000,00/mês · retirada inicial de 6,5% a.a.");
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

describe("planLines", () => {
  it("cenário de aceite: meta compacta, idade do ápice e prazo", () => {
    expect(acceptance.months).toBe(179);
    const lines = planLines(acceptance);
    expect(lines).not.toBeNull();
    expect(lines).not.toHaveProperty("reached");
    const { reach, term } = lines as { reach: string; term: string };
    expect(normalize(reach)).toBe("para alcançar R$ 4,8 mi aos 48 anos");
    expect(normalize(term)).toBe("Você chega ao Ápice em: 14 anos e 11 meses");
  });

  it("um ano restante: Você chega ao Ápice em: 1 ano", () => {
    const summary = summarize({ ...goal, birthDate: "1979-06-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 }, now);
    expect(summary.months).toBe(12);
    expect(planLines(summary)).toEqual({ reach: expect.any(String), term: "Você chega ao Ápice em: 1 ano" });
  });

  it("meta alcançada com prazo: aporte 0 e as duas linhas normais", () => {
    const summary = summarize(
      { ...goal, savedCents: 500_000_000, birthDate: "1993-05-10", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.months).toBe(179);
    expect(summary.monthlyCents).toBe(0);
    const { reach, term } = planLines(summary) as { reach: string; term: string };
    expect(normalize(reach)).toBe("para alcançar R$ 4,8 mi aos 48 anos");
    expect(normalize(term)).toBe("Você chega ao Ápice em: 14 anos e 11 meses");
  });

  it("prazo encerrado com o guardado na meta: Meta alcançada", () => {
    const summary = summarize(
      { ...goal, savedCents: 480_000_000, birthDate: "1978-06-20", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.months).toBe(0);
    expect(summary.monthlyCents).toBe(0);
    expect(planLines(summary)).toEqual({ reached: true });
    expect(PLAN_REACHED).toBe("Meta alcançada");
  });

  it("prazo encerrado sem alcançar a meta: nenhuma linha", () => {
    const summary = summarize(
      { ...goal, savedCents: 56_500_000, birthDate: "1978-06-20", retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 },
      now,
    );
    expect(summary.months).toBe(0);
    expect(summary.monthlyCents).toBeNull();
    expect(planLines(summary)).toBeNull();
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
