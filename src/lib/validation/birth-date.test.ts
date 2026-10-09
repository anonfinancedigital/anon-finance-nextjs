import { describe, expect, it } from "vitest";
import { birthDateGoalConflict, parseBirthDate, today } from "./birth-date";

// 2026-06-15 12:00 em São Paulo.
const now = new Date("2026-06-15T15:00:00Z");

const error = (text: string, at = now) => {
  const result = parseBirthDate(text, at);
  return result.ok ? null : result.error;
};

describe("parseBirthDate", () => {
  it("converte data válida em ISO e idade", () => {
    expect(parseBirthDate("18/09/1993", now)).toEqual({ ok: true, value: { iso: "1993-09-18", age: 32 } });
  });

  it("recusa vazio (NASC-03)", () => {
    expect(error("")).toBe("Informe a data de nascimento");
    expect(error("   ")).toBe("Informe a data de nascimento");
  });

  it("recusa data inexistente ou em outro formato (NASC-04)", () => {
    expect(error("31/02/1990")).toBe("Data de nascimento inválida");
    expect(error("1990-01-01")).toBe("Data de nascimento inválida");
  });

  it("recusa data futura (NASC-05)", () => {
    expect(error("16/06/2026")).toBe("A data de nascimento não pode ser futura");
  });

  it("recusa idade acima de 120 anos (NASC-06)", () => {
    expect(error("14/06/1905")).toBe("A idade atual deve ser de no máximo 120 anos");
  });

  it("aceita hoje em America/Sao_Paulo (NASC-07)", () => {
    expect(parseBirthDate("15/06/2026", now)).toEqual({ ok: true, value: { iso: "2026-06-15", age: 0 } });
    // 01:00 UTC de 16/06 ainda é 15/06 em São Paulo.
    expect(error("15/06/2026", new Date("2026-06-16T01:00:00Z"))).toBeNull();
    expect(error("16/06/2026", new Date("2026-06-16T01:00:00Z"))).toBe("A data de nascimento não pode ser futura");
  });

  it("aceita idade exatamente 120", () => {
    expect(parseBirthDate("15/06/1906", now)).toEqual({ ok: true, value: { iso: "1906-06-15", age: 120 } });
  });

  it("aceita 29/02 de ano bissexto e segue ageOn", () => {
    const before = new Date("2027-02-27T15:00:00Z");
    const after = new Date("2027-02-28T15:00:00Z");
    expect(parseBirthDate("29/02/2000", before)).toEqual({ ok: true, value: { iso: "2000-02-29", age: 26 } });
    expect(parseBirthDate("29/02/2000", after)).toEqual({ ok: true, value: { iso: "2000-02-29", age: 27 } });
  });
});

describe("today", () => {
  it("usa o dia de America/Sao_Paulo", () => {
    expect(today(new Date("2026-06-16T01:00:00Z"))).toEqual({ year: 2026, month: 6, day: 15 });
  });
});

describe("birthDateGoalConflict (NASC-18)", () => {
  const CONFLICT =
    "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (50)";

  it("recusa idade acima da independência: 18/09/1960 tem 65 anos em 2026-06-15", () => {
    const parsed = parseBirthDate("18/09/1960", now);
    expect(parsed.ok && birthDateGoalConflict(parsed.value.age, 50)).toBe(CONFLICT);
  });

  it("recusa idade igual à da independência: 01/01/1976 tem exatamente 50 anos", () => {
    const parsed = parseBirthDate("01/01/1976", now);
    expect(parsed.ok && parsed.value.age).toBe(50);
    expect(parsed.ok && birthDateGoalConflict(parsed.value.age, 50)).toBe(CONFLICT);
  });

  it("aceita idade abaixo da independência: 18/09/1990 tem 35 anos", () => {
    const parsed = parseBirthDate("18/09/1990", now);
    expect(parsed.ok && birthDateGoalConflict(parsed.value.age, 50)).toBeNull();
  });

  it("sem objetivo salvo nunca há conflito", () => {
    expect(birthDateGoalConflict(120, null)).toBeNull();
  });
});
