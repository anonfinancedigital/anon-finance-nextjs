import { describe, expect, it } from "vitest";
import { DecryptError, decryptField } from "@/lib/crypto/aead";
import { sealBirthDate, sealGoal, sealTransaction } from "./seal";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const USER = "user-1";
const ROW = "row-1";

describe("sealTransaction", () => {
  it("valor e descrição decifram com o AAD da própria linha e coluna", async () => {
    const dek = await newKey();
    const sealed = await sealTransaction(dek, USER, ROW, { amountCents: 123456, description: "Café da manhã" });
    expect(await decryptField(dek, sealed.amountCt, "transaction.amount_ct.user-1.row-1")).toBe("123456");
    expect(await decryptField(dek, sealed.descriptionCt!, "transaction.description_ct.user-1.row-1")).toBe(
      "Café da manhã",
    );
  });

  it.each([
    ["outra linha", "transaction.amount_ct.user-1.row-2"],
    ["outra coluna", "transaction.description_ct.user-1.row-1"],
    ["outro usuário", "transaction.amount_ct.user-2.row-1"],
  ])("valor com AAD de %s lança DecryptError", async (_label, otherAad) => {
    const dek = await newKey();
    const { amountCt } = await sealTransaction(dek, USER, ROW, { amountCents: 500, description: null });
    await expect(decryptField(dek, amountCt, otherAad)).rejects.toBeInstanceOf(DecryptError);
  });

  it("descrição com AAD de outra linha ou do valor lança DecryptError", async () => {
    const dek = await newKey();
    const { descriptionCt } = await sealTransaction(dek, USER, ROW, { amountCents: 500, description: "Aluguel" });
    await expect(decryptField(dek, descriptionCt!, "transaction.description_ct.user-1.row-2")).rejects.toBeInstanceOf(
      DecryptError,
    );
    await expect(decryptField(dek, descriptionCt!, "transaction.amount_ct.user-1.row-1")).rejects.toBeInstanceOf(
      DecryptError,
    );
  });

  it.each([
    ["null", null],
    ["vazia", ""],
  ])("descrição %s vira null", async (_label, description) => {
    const dek = await newKey();
    const sealed = await sealTransaction(dek, USER, ROW, { amountCents: 500, description });
    expect(sealed.descriptionCt).toBeNull();
    expect(sealed.amountCt).toMatch(/^v1:[A-Za-z0-9_-]+$/);
  });

  it("valor e descrição nunca aparecem na saída", async () => {
    const dek = await newKey();
    const sealed = await sealTransaction(dek, USER, ROW, { amountCents: 987654, description: "Mercado" });
    const out = JSON.stringify(sealed);
    expect(out).not.toContain("987654");
    expect(out).not.toContain("Mercado");
    expect(sealed.amountCt).toMatch(/^v1:[A-Za-z0-9_-]+$/);
    expect(sealed.descriptionCt).toMatch(/^v1:[A-Za-z0-9_-]+$/);
  });
});

describe("sealGoal", () => {
  const goal = {
    monthlyIncomeCents: 1500000,
    savedCents: 25000000,
    retirementAge: 55,
    annualRateBp: 800,
    withdrawalRateBp: 400,
  };
  const expected = [
    ["monthlyIncomeCt", "financial_goal.monthly_income_ct.user-1", "1500000"],
    ["savedCt", "financial_goal.saved_ct.user-1", "25000000"],
    ["retirementAgeCt", "financial_goal.retirement_age_ct.user-1", "55"],
    ["annualRateCt", "financial_goal.annual_rate_ct.user-1", "800"],
    ["withdrawalRateCt", "financial_goal.withdrawal_rate_ct.user-1", "400"],
  ] as const;

  it("cada campo decifra com a própria coluna e o texto decimal do valor", async () => {
    const dek = await newKey();
    const sealed = await sealGoal(dek, USER, goal);
    for (const [field, columnAad, text] of expected) {
      expect(await decryptField(dek, sealed[field], columnAad)).toBe(text);
    }
  });

  it("cada campo falha com a coluna de outro campo ou de outro usuário", async () => {
    const dek = await newKey();
    const sealed = await sealGoal(dek, USER, goal);
    for (const [index, [field]] of expected.entries()) {
      const otherColumn = expected[(index + 1) % expected.length][1];
      await expect(decryptField(dek, sealed[field], otherColumn)).rejects.toBeInstanceOf(DecryptError);
      const otherUser = expected[index][1].replace("user-1", "user-2");
      await expect(decryptField(dek, sealed[field], otherUser)).rejects.toBeInstanceOf(DecryptError);
    }
  });

  it("nenhum valor da meta aparece na saída", async () => {
    const dek = await newKey();
    const out = JSON.stringify(await sealGoal(dek, USER, goal));
    expect(out).not.toContain("1500000");
    expect(out).not.toContain("25000000");
  });
});

describe("sealBirthDate", () => {
  it("decifra com o AAD do usuário e falha com outro usuário ou coluna", async () => {
    const dek = await newKey();
    const ct = await sealBirthDate(dek, USER, "1990-05-17");
    expect(ct).not.toContain("1990");
    expect(await decryptField(dek, ct, "user_vault.birth_date_ct.user-1")).toBe("1990-05-17");
    await expect(decryptField(dek, ct, "user_vault.birth_date_ct.user-2")).rejects.toBeInstanceOf(DecryptError);
    await expect(decryptField(dek, ct, "financial_goal.saved_ct.user-1")).rejects.toBeInstanceOf(DecryptError);
  });
});
