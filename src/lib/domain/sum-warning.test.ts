import { describe, expect, it } from "vitest";
import { sumWarning } from "./sum-warning";

describe("sumWarning", () => {
  it("shows the excess in percent and R$ with a plain space", () => {
    const text = sumWarning(100_005_248, 1_905_400);
    expect(text).toBe("A soma deve ser 100%. Atual: 100,01% (+R$ 1,00)");
    expect(text).not.toContain(" ");
  });

  it("shows the shortfall with a minus sign", () => {
    expect(sumWarning(99_994_752, 1_905_400)).toBe("A soma deve ser 100%. Atual: 99,99% (-R$ 1,00)");
  });

  it("omits the R$ part without a reference income", () => {
    expect(sumWarning(100_005_248, null)).toBe("A soma deve ser 100%. Atual: 100,01%");
  });

  it("omits the R$ part when the difference rounds to R$ 0,00", () => {
    expect(sumWarning(100_000_001, 10_000)).toBe("A soma deve ser 100%. Atual: 100,000001%");
  });

  it("uses up to 6 decimals when the sum would round to 100,00%", () => {
    expect(sumWarning(99_999_999, null)).toBe("A soma deve ser 100%. Atual: 99,999999%");
  });
});
