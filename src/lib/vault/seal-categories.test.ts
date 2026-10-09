import { describe, expect, it } from "vitest";
import { DecryptError, decryptField } from "@/lib/crypto/aead";
import { sealCategorySet } from "./seal-categories";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const USER = "user-1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** 31/10/2026 23:30 in America/Sao_Paulo (UTC-3): the current month there is October. */
const NOW = new Date("2026-11-01T02:30:00Z");

const CAT = "11111111-1111-4111-8111-111111111111";
const SUB_A = "22222222-2222-4222-8222-222222222222";
const SUB_B = "33333333-3333-4333-8333-333333333333";

/** Versions of `CAT`: 30% since ever, 50% from December (after the current month). */
const current = new Map([
  [
    CAT,
    [
      { fromMonth: "0001-01-01", percentMicro: 30_000_000 },
      { fromMonth: "2026-12-01", percentMicro: 50_000_000 },
    ],
  ],
]);

const existing = (percentMicro: number) => ({
  id: CAT,
  name: "Moradia",
  percentMicro,
  color: 2,
  subcategories: [{ id: SUB_A, name: "Aluguel" }],
});

describe("sealCategorySet", () => {
  it("percentual igual ao vigente no mês corrente não gera percentChange", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(dek, USER, [existing(30_000_000)], current, NOW);
    expect(dto.items[0]).not.toHaveProperty("percentChange");
    expect(dto.items[0].id).toBe(CAT);
    expect(dto.items[0].clientId).toBe(CAT);
  });

  it("percentual diferente gera percentChange no mês corrente de America/Sao_Paulo", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(dek, USER, [existing(50_000_000)], current, NOW);
    const change = dto.items[0].percentChange!;
    expect(change.fromMonth).toBe("2026-10-01");
    expect(await decryptField(dek, change.percentCt, `category_percent.percent_ct.user-1.${CAT}.2026-10-01`)).toBe(
      "50000000",
    );
    await expect(
      decryptField(dek, change.percentCt, `category_percent.percent_ct.user-1.${CAT}.2026-11-01`),
    ).rejects.toBeInstanceOf(DecryptError);
  });

  it("categoria existente sem versão vigente gera percentChange", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(dek, USER, [existing(10_000_000)], new Map(), NOW);
    expect(dto.items[0].percentChange?.fromMonth).toBe("2026-10-01");
  });

  it("categoria nova recebe id do cliente, nome cifrado com o AAD da própria linha e percentChange", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(
      dek,
      USER,
      [{ name: "Lazer", percentMicro: 20_000_000, color: 5, isInvestment: true }],
      current,
      NOW,
    );
    const item = dto.items[0];
    expect(item).not.toHaveProperty("id");
    expect(item.clientId).toMatch(UUID);
    expect(item.clientId).not.toBe(CAT);
    expect(item.color).toBe(5);
    expect(item.isInvestment).toBe(true);
    expect(await decryptField(dek, item.nameCt, `category.name_ct.user-1.${item.clientId}`)).toBe("Lazer");
    expect(item.percentChange!.fromMonth).toBe("2026-10-01");
    expect(
      await decryptField(dek, item.percentChange!.percentCt, `category_percent.percent_ct.user-1.${item.clientId}.2026-10-01`),
    ).toBe("20000000");
    expect(item.subcategories).toEqual([]);
  });

  it("subcategoria nova recebe id e nome cifrado com o AAD da própria linha; a existente mantém o id", async () => {
    const dek = await newKey();
    const draft = { ...existing(30_000_000), subcategories: [{ id: SUB_A, name: "Aluguel" }, { name: "Condomínio" }] };
    const dto = await sealCategorySet(dek, USER, [draft], current, NOW);
    const [kept, created] = dto.items[0].subcategories;
    expect(kept.id).toBe(SUB_A);
    expect(await decryptField(dek, kept.nameCt, `subcategory.name_ct.user-1.${SUB_A}`)).toBe("Aluguel");
    expect(created.id).toMatch(UUID);
    expect(created.id).not.toBe(SUB_A);
    expect(await decryptField(dek, created.nameCt, `subcategory.name_ct.user-1.${created.id}`)).toBe("Condomínio");
    await expect(decryptField(dek, created.nameCt, `subcategory.name_ct.user-1.${SUB_A}`)).rejects.toBeInstanceOf(
      DecryptError,
    );
  });

  it("nome da categoria existente decifra só com o AAD da própria linha", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(dek, USER, [existing(30_000_000)], current, NOW);
    expect(await decryptField(dek, dto.items[0].nameCt, `category.name_ct.user-1.${CAT}`)).toBe("Moradia");
    await expect(decryptField(dek, dto.items[0].nameCt, `subcategory.name_ct.user-1.${CAT}`)).rejects.toBeInstanceOf(
      DecryptError,
    );
  });

  it("subcategorias omitidas não aparecem no DTO", async () => {
    const dek = await newKey();
    const draft = { ...existing(30_000_000), subcategories: [{ id: SUB_B, name: "Luz" }] };
    const dto = await sealCategorySet(dek, USER, [draft], current, NOW);
    expect(dto.items[0].subcategories.map((s) => s.id)).toEqual([SUB_B]);
    const without = await sealCategorySet(dek, USER, [{ ...existing(30_000_000), subcategories: undefined }], current, NOW);
    expect(without.items[0].subcategories).toEqual([]);
  });

  it("nenhum nome ou percentual aparece em claro no DTO", async () => {
    const dek = await newKey();
    const dto = await sealCategorySet(dek, USER, [existing(50_000_000)], current, NOW);
    const out = JSON.stringify(dto);
    expect(out).not.toContain("Moradia");
    expect(out).not.toContain("Aluguel");
    expect(out).not.toContain("50000000");
  });
});
