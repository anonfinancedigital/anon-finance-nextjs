import { describe, expect, it } from "vitest";
import { ageTicks } from "./age-ticks";
import { summarize } from "./freedom";

describe("ageTicks", () => {
  it("objetivo de 34 a 45 anos termina em 45 com no máximo 9 rótulos", () => {
    const ticks = ageTicks(34, 45);
    expect(ticks[ticks.length - 1]).toBe(45);
    expect(ticks.length).toBeLessThanOrEqual(9);
  });

  it("rótulos são inteiros crescentes e distintos, mesmo em um intervalo longo", () => {
    const ticks = ageTicks(20, 80);
    expect(ticks[ticks.length - 1]).toBe(80);
    expect(ticks.length).toBeLessThanOrEqual(9);
    expect(ticks.every((t) => Number.isInteger(t))).toBe(true);
    expect(ticks).toEqual([...new Set(ticks)].sort((a, b) => a - b));
  });

  it("menos de 9 anos de distância rotula cada idade inteira", () => {
    expect(ageTicks(34, 38)).toEqual([34, 35, 36, 37, 38]);
  });

  it("intervalo de uma idade devolve essa idade", () => {
    expect(ageTicks(45, 45)).toEqual([45]);
  });

  it("distância de 8 anos rotula as 9 idades inteiras", () => {
    expect(ageTicks(34, 42)).toEqual([34, 35, 36, 37, 38, 39, 40, 41, 42]);
  });

  it("em toda distância de 0 a 60 anos o eixo termina na idade final, com no máximo 9 rótulos crescentes e distintos", () => {
    for (let span = 0; span <= 60; span++) {
      const ticks = ageTicks(30, 30 + span);
      expect(ticks[ticks.length - 1], `span ${span}`).toBe(30 + span);
      expect(ticks.length, `span ${span}`).toBeLessThanOrEqual(9);
      expect(ticks, `span ${span}`).toEqual([...new Set(ticks)].sort((a, b) => a - b));
    }
  });

  it("de 33 a 48 anos o primeiro rótulo é 33 e o último é 48, com no máximo 9 rótulos", () => {
    const ticks = ageTicks(33, 48);
    expect(ticks[0]).toBe(33);
    expect(ticks[ticks.length - 1]).toBe(48);
    expect(ticks.length).toBeLessThanOrEqual(9);
  });

  it("intervalo curto de 33 a 35 devolve 33, 34, 35", () => {
    expect(ageTicks(33, 35)).toEqual([33, 34, 35]);
  });

  it("em toda distância de 1 a 60 anos o primeiro rótulo é a idade atual, o último é a final e a ordem é crescente sem repetição", () => {
    for (let span = 1; span <= 60; span++) {
      const ticks = ageTicks(33, 33 + span);
      expect(ticks[0], `span ${span}`).toBe(33);
      expect(ticks[ticks.length - 1], `span ${span}`).toBe(33 + span);
      expect(ticks.length, `span ${span}`).toBeLessThanOrEqual(9);
      expect(ticks, `span ${span}`).toEqual([...new Set(ticks)].sort((a, b) => a - b));
    }
  });

  it("idade atual fracionária começa na idade inteira atual (APICE-10.6)", () => {
    expect(ageTicks(33.4, 36.8)).toEqual([33, 34, 35, 36]);
  });

  it("com a idade fracionária real do pipeline o primeiro rótulo é a idade atual do resumo", () => {
    const now = new Date("2026-07-15T15:00:00Z");
    const goal = { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 };
    for (const birthDate of ["1993-05-10", "1993-06-16", "1993-07-15", "1993-08-20", "1993-12-31"]) {
      const summary = summarize({ ...goal, birthDate }, now);
      const first = summary.timeline[0].age;
      const last = summary.timeline[summary.timeline.length - 1].age;
      expect(ageTicks(first, last)[0], birthDate).toBe(summary.currentAge);
    }
    expect(Number.isInteger(summarize({ ...goal, birthDate: "1993-05-10" }, now).timeline[0].age)).toBe(false);
  });

  describe("com o aniversário no mês corrente (APICE-10.6)", () => {
    const now = new Date("2026-10-07T15:00:00Z");
    const goal = { monthlyIncomeCents: 2_000_000, savedCents: 56_500_000, retirementAge: 48, annualRateBp: 800, withdrawalRateBp: 500 };
    it.each([
      ["1993-10-20", 32, "aniversário ainda não chegou"],
      ["1993-10-07", 33, "aniversário é hoje"],
      ["1993-10-01", 33, "aniversário já passou no mês"],
      ["1993-10-31", 32, "aniversário no fim do mês"],
    ])("nascimento %s: idade atual %i (%s) é o primeiro rótulo, com rótulos crescentes e distintos", (birthDate, age) => {
      const summary = summarize({ ...goal, birthDate }, now);
      expect(summary.currentAge).toBe(age);
      const ticks = ageTicks(summary.currentAge, summary.timeline[summary.timeline.length - 1].age);
      expect(ticks[0]).toBe(age);
      expect(ticks.at(-1)).toBe(48);
      expect(ticks).toEqual([...new Set(ticks)].sort((a, b) => a - b));
    });
  });
});
