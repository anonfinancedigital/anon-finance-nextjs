/**
 * Where the "Meta" plate sits relative to the target line. Above the line by default; below it when the
 * curve already starts at or above the target (goal reached with time left), so the plate does not cover
 * the start of the series (APICE-09).
 */
export function targetLabelPlacement(firstTotalCents: number, targetCents: number): "above" | "below" {
  return firstTotalCents >= targetCents ? "below" : "above";
}
