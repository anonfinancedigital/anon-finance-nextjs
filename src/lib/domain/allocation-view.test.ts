import { describe, expect, it } from "vitest";
import { allocationView } from "./allocation-view";

describe("allocationView", () => {
  it("shows only the empty state and a zero progress with no rows", () => {
    expect(allocationView(0, 0)).toEqual({
      empty: true,
      showBar: false,
      showAdjust: false,
      saveDisabled: false,
      saveHint: null,
      progressValue: 0,
      progressTone: "under",
      progressText: "0% alocado",
    });
  });

  it("flags and blocks saving with one row below 100%, without the adjust controls", () => {
    expect(allocationView(1, 40_000_000)).toEqual({
      empty: false,
      showBar: true,
      showAdjust: false,
      saveDisabled: true,
      saveHint: "Some 100% para salvar",
      progressValue: 40,
      progressTone: "under",
      progressText: "40,00% alocado · faltam 60,00% para 100%",
    });
  });

  it("offers the adjust controls from two rows while the sum is not 100%", () => {
    expect(allocationView(2, 40_000_000).showAdjust).toBe(true);
  });

  it("hides the adjust controls and the save hint at 100%, and the bar until something changes", () => {
    const view = allocationView(2, 100_000_000);
    expect(view.showBar).toBe(false);
    expect(view.showAdjust).toBe(false);
    expect(view.saveHint).toBeNull();
    expect(view.progressTone).toBe("exact");
    expect(view.progressText).toBe("100% alocado");
  });

  it("shows the bar at 100% once the rows are dirty, with save allowed", () => {
    expect(allocationView(2, 100_000_000, 2, true)).toMatchObject({ showBar: true, saveDisabled: false });
  });

  it("caps the bar at 100 while keeping the real sum and the excess in the text above 100%", () => {
    const view = allocationView(1, 105_000_000);
    expect(view.progressValue).toBe(100);
    expect(view.progressTone).toBe("over");
    expect(view.progressText).toBe("105,00% alocado · 5,00% acima de 100%");
  });

  it("keeps the bar, the adjust controls and the save hint above 100% with 2+ rows", () => {
    expect(allocationView(2, 105_000_000)).toMatchObject({
      showBar: true,
      showAdjust: true,
      saveHint: "Some 100% para salvar",
      progressValue: 100,
      progressTone: "over",
    });
  });

  it("treats a cleared percentage on a single row as 0% with the bar", () => {
    const view = allocationView(1, 0);
    expect(view.showBar).toBe(true);
    expect(view.progressText).toBe("0% alocado · faltam 100,00% para 100%");
  });

  it("keeps the precision of a sum just below 100%", () => {
    expect(allocationView(3, 99_999_999).progressText).toBe(
      "99,999999% alocado · faltam 0,000001% para 100%",
    );
  });

  it("shows an enabled save with no hint when the last saved category was removed", () => {
    expect(allocationView(0, 0, 1, true)).toEqual({
      empty: true,
      showBar: true,
      showAdjust: false,
      saveDisabled: false,
      saveHint: null,
      progressValue: 0,
      progressTone: "under",
      progressText: "0% alocado",
    });
  });

  it("keeps the bar hidden with no rows when nothing is saved", () => {
    expect(allocationView(0, 0, 0, true).showBar).toBe(false);
  });

  it("requires 100% again once a row is added after removing the last saved category", () => {
    expect(allocationView(1, 0, 1, true)).toMatchObject({
      showBar: true,
      saveDisabled: true,
      saveHint: "Some 100% para salvar",
    });
  });

  it("enables save at exactly 100% and disables it at 99,999999%", () => {
    expect(allocationView(2, 100_000_000).saveDisabled).toBe(false);
    expect(allocationView(2, 99_999_999).saveDisabled).toBe(true);
  });
});

describe("allocationView progress text", () => {
  it("reads the example from the screen: above 100%", () => {
    expect(allocationView(6, 104_960_000).progressText).toBe("104,96% alocado · 4,96% acima de 100%");
  });

  it("reads below 100%", () => {
    expect(allocationView(6, 95_040_000).progressText).toBe("95,04% alocado · faltam 4,96% para 100%");
  });
});
