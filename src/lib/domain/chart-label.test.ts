import { describe, expect, it } from "vitest";
import { targetLabelPlacement } from "./chart-label";
import { summarize } from "./freedom";

const now = new Date(2026, 9, 7);
const base = { monthlyIncomeCents: 250_000, birthDate: "1993-07-10", retirementAge: 48, annualRateBp: 1000, withdrawalRateBp: 600 };

function placementOf(savedCents: number) {
  const summary = summarize({ ...base, savedCents }, now);
  return targetLabelPlacement(summary.timeline[0].totalCents, summary.targetCents);
}

describe("targetLabelPlacement (APICE-09.5)", () => {
  it("meta já alcançada com prazo restante (guardado R$ 650 mil, 33 a 48 anos): placa abaixo da linha", () => {
    const summary = summarize({ ...base, savedCents: 65_000_000 }, now);
    expect(summary.currentAge).toBe(33);
    expect(summary.timeline[0].totalCents).toBeGreaterThanOrEqual(summary.targetCents);
    expect(placementOf(65_000_000)).toBe("below");
  });

  it("curva que começa abaixo da meta (nada guardado): placa acima da linha", () => {
    expect(placementOf(0)).toBe("above");
  });

  it("fronteira: primeiro ponto exatamente na meta fica abaixo; um centavo antes, acima", () => {
    expect(targetLabelPlacement(50_000_000, 50_000_000)).toBe("below");
    expect(targetLabelPlacement(49_999_999, 50_000_000)).toBe("above");
  });
});
