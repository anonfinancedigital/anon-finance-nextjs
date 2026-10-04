import { describe, expect, it } from "vitest";
import { ageOn, ANNUAL_RATE_BP, monthsUntilRetirement, progressBp, targetCents } from "./freedom";

describe("targetCents", () => {
  it("R$ 10.000,00 de renda dá alvo de R$ 1.500.000,00", () => {
    expect(targetCents(1_000_000)).toBe(150_000_000);
  });

  it("R$ 0,01 de renda dá R$ 1,50", () => {
    expect(targetCents(1)).toBe(150);
  });

  it("usa taxa anual de 8%", () => {
    expect(ANNUAL_RATE_BP).toBe(800);
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
