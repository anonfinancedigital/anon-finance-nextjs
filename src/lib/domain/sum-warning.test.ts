import { describe, expect, it } from "vitest";
import { sumGap } from "./sum-warning";

describe("sumGap", () => {
  it("says how much was exceeded, in percent and R$ with a plain space", () => {
    const gap = sumGap(100_005_248, 1_905_400);
    expect(gap).toEqual({ direction: "over", percent: "0,01%", text: "Passou 0,01% (+R$ 1,00)" });
    expect(gap.text).not.toContain(" ");
  });

  it("says how much is left to distribute, without a minus sign", () => {
    expect(sumGap(99_994_752, 1_905_400)).toEqual({
      direction: "under",
      percent: "0,01%",
      text: "Faltam 0,01% (R$ 1,00 para distribuir)",
    });
  });

  it("reports a gap of whole percents", () => {
    expect(sumGap(101_100_000, 18_159_53)).toEqual({
      direction: "over",
      percent: "1,10%",
      text: "Passou 1,10% (+R$ 199,75)",
    });
    expect(sumGap(95_000_000, 1_000_000)).toEqual({
      direction: "under",
      percent: "5,00%",
      text: "Faltam 5,00% (R$ 500,00 para distribuir)",
    });
  });

  it("omits the R$ part without a reference income", () => {
    expect(sumGap(100_005_248, null)).toEqual({ direction: "over", percent: "0,01%", text: "Passou 0,01%" });
  });

  it("omits the R$ part when the difference rounds to R$ 0,00", () => {
    expect(sumGap(100_000_001, 10_000)).toEqual({
      direction: "over",
      percent: "0,000001%",
      text: "Passou 0,000001%",
    });
  });

  it("uses up to 6 decimals when the gap would show as 0,00%", () => {
    expect(sumGap(99_999_999, null)).toEqual({
      direction: "under",
      percent: "0,000001%",
      text: "Faltam 0,000001%",
    });
  });

  it("is exact, with no text, at 100%", () => {
    expect(sumGap(100_000_000, 1_000_000)).toEqual({ direction: "exact", percent: "", text: "" });
  });
});
