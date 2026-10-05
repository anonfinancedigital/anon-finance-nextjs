import { describe, expect, it } from "vitest";
import { ageTicks } from "./age-ticks";

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
});
