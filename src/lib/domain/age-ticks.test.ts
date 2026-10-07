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

  it("idade atual fracionária começa no primeiro ano inteiro", () => {
    expect(ageTicks(33.4, 36.8)).toEqual([34, 35, 36]);
  });
});
