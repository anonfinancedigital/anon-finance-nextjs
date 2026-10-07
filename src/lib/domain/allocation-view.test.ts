import { describe, expect, it } from "vitest";
import { allocationView } from "./allocation-view";

describe("allocationView", () => {
  it("shows only the empty state and a zero progress with no rows", () => {
    expect(allocationView(0, 0)).toEqual({
      empty: true,
      showSumWarning: false,
      showAdjust: false,
      showSave: false,
      saveHint: null,
      progressValue: 0,
      progressText: "0% de 100% alocado",
    });
  });

  it("warns and blocks saving with one row below 100%, without the adjust controls", () => {
    expect(allocationView(1, 40_000_000)).toEqual({
      empty: false,
      showSumWarning: true,
      showAdjust: false,
      showSave: true,
      saveHint: "Some 100% para salvar",
      progressValue: 40,
      progressText: "40,00% de 100% alocado",
    });
  });

  it("offers the adjust controls from two rows while the sum is not 100%", () => {
    expect(allocationView(2, 40_000_000).showAdjust).toBe(true);
  });

  it("hides the warning, the adjust controls and the save hint at 100%", () => {
    const view = allocationView(2, 100_000_000);
    expect(view.showSumWarning).toBe(false);
    expect(view.showAdjust).toBe(false);
    expect(view.saveHint).toBeNull();
    expect(view.progressText).toBe("100,00% de 100% alocado");
  });

  it("caps the bar at 100 while keeping the real sum in the text above 100%", () => {
    const view = allocationView(1, 105_000_000);
    expect(view.progressValue).toBe(100);
    expect(view.progressText).toBe("105,00% de 100% alocado");
  });

  it("treats a cleared percentage on a single row as 0% with the warning", () => {
    const view = allocationView(1, 0);
    expect(view.showSumWarning).toBe(true);
    expect(view.progressText).toBe("0% de 100% alocado");
  });

  it("keeps the precision of a sum just below 100%", () => {
    expect(allocationView(3, 99_999_999).progressText).toBe("99,999999% de 100% alocado");
  });
});
