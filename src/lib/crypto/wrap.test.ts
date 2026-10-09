import { describe, expect, it } from "vitest";
import { DecryptError, decryptField } from "./aead";
import { unwrapDek, wrapDek } from "./wrap";

const newKek = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const DEK = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 256);

describe("wrapDek / unwrapDek", () => {
  it("ida e volta devolve os 32 bytes da DEK", async () => {
    const kek = await newKek();
    const wrapped = await wrapDek(kek, DEK, "user-1");
    const dek = await unwrapDek(kek, wrapped, "user-1");
    expect(dek).toHaveLength(32);
    expect(dek).toEqual(DEK);
  });

  it("saída começa com v1: e usa AAD vault.dek.<userId>", async () => {
    const kek = await newKek();
    const wrapped = await wrapDek(kek, DEK, "user-1");
    expect(wrapped.startsWith("v1:")).toBe(true);
    await expect(decryptField(kek, wrapped, "vault.dek.user-1")).resolves.toEqual(expect.any(String));
  });

  it("KEK errada lança DecryptError", async () => {
    const wrapped = await wrapDek(await newKek(), DEK, "user-1");
    await expect(unwrapDek(await newKek(), wrapped, "user-1")).rejects.toBeInstanceOf(DecryptError);
  });

  it("userId errado lança DecryptError", async () => {
    const kek = await newKek();
    const wrapped = await wrapDek(kek, DEK, "user-1");
    await expect(unwrapDek(kek, wrapped, "user-2")).rejects.toBeInstanceOf(DecryptError);
  });

  it("conteúdo que não tem 32 bytes lança DecryptError", async () => {
    const kek = await newKek();
    const wrapped = await wrapDek(kek, new Uint8Array(16), "user-1");
    await expect(unwrapDek(kek, wrapped, "user-1")).rejects.toBeInstanceOf(DecryptError);
  });
});
