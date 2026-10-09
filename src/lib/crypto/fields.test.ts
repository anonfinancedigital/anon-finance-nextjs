import { describe, expect, it } from "vitest";
import { aad, decryptField, encryptField } from "./aead";
import { centsCodec, dateCodec, intCodec, microCodec, openNullable, sealNullable, textCodec } from "./fields";

describe("codecs numéricos", () => {
  it.each([
    ["centsCodec", centsCodec, 1],
    ["centsCodec", centsCodec, 99_999_999_999],
    ["microCodec", microCodec, 1],
    ["microCodec", microCodec, 100_000_000],
    ["intCodec", intCodec, 0],
    ["intCodec", intCodec, 65],
  ])("%s ida e volta de %i", (_name, codec, value) => {
    const text = codec.encode(value);
    expect(text).toBe(String(value));
    expect(codec.decode(text)).toBe(value);
  });

  it.each([centsCodec, microCodec, intCodec].flatMap((codec) => ["007", "1e3", " 5", "-0", ""].map((bad) => [bad, codec] as const)))(
    "decode lança em texto não canônico %j",
    (bad, codec) => {
      expect(() => codec.decode(bad)).toThrow();
    },
  );

  it.each([[1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])("encode lança em número não inteiro %s", (value) => {
    expect(() => centsCodec.encode(value)).toThrow();
  });
});

describe("textCodec", () => {
  it.each([[""], ["Pão de açúcar"]])("ida e volta de %j", (value) => {
    expect(textCodec.decode(textCodec.encode(value))).toBe(value);
  });
});

describe("dateCodec", () => {
  it.each([["1990-02-28"], ["2000-02-29"]])("ida e volta de %s", (value) => {
    expect(dateCodec.encode(value)).toBe(value);
    expect(dateCodec.decode(value)).toBe(value);
  });

  it.each([["1990-2-28"], ["2023-02-29"], ["2024-13-01"], [""]])("decode lança em %j", (bad) => {
    expect(() => dateCodec.decode(bad)).toThrow();
  });
});

describe("sealNullable / openNullable", () => {
  const AAD = aad("transaction", "description_ct", "user-1", "row-1");

  it("null ↔ null sem cifrar", async () => {
    const fail = () => Promise.reject(new Error("não deveria cifrar"));
    expect(await sealNullable(null, fail)).toBeNull();
    expect(await openNullable(null, fail)).toBeNull();
  });

  it("valor presente passa pela cifra e volta igual", async () => {
    const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const ct = await sealNullable("Mercado", (text) => encryptField(dek, textCodec.encode(text), AAD));
    expect(ct).toMatch(/^v1:/);
    expect(await openNullable(ct, async (c) => textCodec.decode(await decryptField(dek, c, AAD)))).toBe("Mercado");
  });
});
