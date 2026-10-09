import { describe, expect, it } from "vitest";
import { DecryptError, aad, decryptField, encryptField } from "./aead";
import { fromBase64Url, toBase64Url } from "./base64url";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const AAD = aad("transaction", "amount_ct", "user-1", "row-1");

describe("aad", () => {
  it("monta tabela.coluna.userId[.rowId]", () => {
    expect(aad("transaction", "amount_ct", "user-1", "row-1")).toBe("transaction.amount_ct.user-1.row-1");
    expect(aad("financial_goal", "saved_ct", "user-1")).toBe("financial_goal.saved_ct.user-1");
  });
});

describe("encryptField / decryptField", () => {
  it.each([
    ["vazio", ""],
    ["ASCII", "Mercado do mes"],
    ["acentos", "Pão de açúcar, café e maçã"],
    ["2 KB", "x".repeat(2048)],
  ])("ida e volta devolve o texto original (%s)", async (_label, plaintext) => {
    const dek = await newKey();
    const ct = await encryptField(dek, plaintext, AAD);
    expect(ct).toMatch(/^v1:[A-Za-z0-9_-]+$/);
    expect(await decryptField(dek, ct, AAD)).toBe(plaintext);
  });

  it("duas cifragens do mesmo texto e AAD diferem", async () => {
    const dek = await newKey();
    const a = await encryptField(dek, "12345", AAD);
    const b = await encryptField(dek, "12345", AAD);
    expect(a).not.toBe(b);
  });

  it.each([
    ["outra linha", aad("transaction", "amount_ct", "user-1", "row-2")],
    ["outra coluna", aad("transaction", "description_ct", "user-1", "row-1")],
    ["outro usuário", aad("transaction", "amount_ct", "user-2", "row-1")],
  ])("AAD de %s lança DecryptError", async (_label, otherAad) => {
    const dek = await newKey();
    const ct = await encryptField(dek, "12345", AAD);
    await expect(decryptField(dek, ct, otherAad)).rejects.toBeInstanceOf(DecryptError);
  });

  it("chave errada lança DecryptError", async () => {
    const ct = await encryptField(await newKey(), "12345", AAD);
    await expect(decryptField(await newKey(), ct, AAD)).rejects.toBeInstanceOf(DecryptError);
  });

  it.each([
    [
      "byte alterado",
      (ct: string) => {
        const bytes = fromBase64Url(ct.slice(3));
        bytes[bytes.length - 1] ^= 0x01;
        return `v1:${toBase64Url(bytes)}`;
      },
    ],
    ["prefixo v2:", (ct: string) => `v2:${ct.slice(3)}`],
    ["base64 inválido", (ct: string) => `v1:${ct.slice(3, 10)}+/=`],
    ["payload curto", () => `v1:${toBase64Url(new Uint8Array(27))}`],
  ])("%s lança DecryptError", async (_label, tamper) => {
    const dek = await newKey();
    const ct = await encryptField(dek, "12345", AAD);
    await expect(decryptField(dek, tamper(ct), AAD)).rejects.toBeInstanceOf(DecryptError);
  });
});
