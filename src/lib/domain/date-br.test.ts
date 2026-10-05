import { describe, expect, it } from "vitest";
import { brToIso, isoToBR, maskDateInput } from "./date-br";

describe("isoToBR", () => {
  it("1993-09-18 vira 18/09/1993", () => {
    expect(isoToBR("1993-09-18")).toBe("18/09/1993");
  });
});

describe("brToIso", () => {
  it("18/09/1993 vira 1993-09-18", () => {
    expect(brToIso("18/09/1993")).toBe("1993-09-18");
  });

  it.each([["31/02/1993"], ["1993-09-18"], ["18/09/93"], [""]])("rejeita %j", (text) => {
    expect(brToIso(text)).toBeNull();
  });
});

describe("maskDateInput", () => {
  it("insere as barras: 18091993 vira 18/09/1993", () => {
    expect(maskDateInput("18091993")).toBe("18/09/1993");
  });

  it("máscara parcial: 1809 vira 18/09", () => {
    expect(maskDateInput("1809")).toBe("18/09");
  });

  it("descarta não dígitos e corta em 8 dígitos", () => {
    expect(maskDateInput("18/09/1993x9")).toBe("18/09/1993");
  });
});
