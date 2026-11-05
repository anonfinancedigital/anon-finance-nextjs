import { describe, expect, it } from "vitest";
import { sealedTransactionUpdateExtraSchema } from "./transaction-sealed";

const base = {
  newRowId: "11111111-1111-4111-8111-111111111111",
  insertedCt: { amountCt: "v1:abc", descriptionCt: null },
};

describe("sealedTransactionUpdateExtraSchema paid (PAGO-12)", () => {
  it("aceita paid ausente e não o inventa", () => {
    const parsed = sealedTransactionUpdateExtraSchema.parse(base);
    expect(parsed.paid).toBeUndefined();
  });

  it("mantém paid true e false", () => {
    expect(sealedTransactionUpdateExtraSchema.parse({ ...base, paid: true }).paid).toBe(true);
    expect(sealedTransactionUpdateExtraSchema.parse({ ...base, paid: false }).paid).toBe(false);
  });

  it("rejeita paid que não é booleano", () => {
    expect(sealedTransactionUpdateExtraSchema.safeParse({ ...base, paid: "true" }).success).toBe(false);
    expect(sealedTransactionUpdateExtraSchema.safeParse({ ...base, paid: null }).success).toBe(false);
  });
});
