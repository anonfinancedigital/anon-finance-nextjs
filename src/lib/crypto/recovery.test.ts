import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { describe, expect, it } from "vitest";
import { DecryptError, decryptField, encryptField } from "./aead";
import { InvalidRecoveryKey, generateRecoveryKey, parseRecoveryKey, recoveryKek } from "./recovery";

const CROCKFORD = "[0-9A-HJKMNP-TV-Z]";

describe("generateRecoveryKey", () => {
  it("gera 16 bytes e parse(display) devolve os mesmos bytes", () => {
    const { display, bytes } = generateRecoveryKey();
    expect(bytes).toHaveLength(16);
    expect(parseRecoveryKey(display)).toEqual(bytes);
  });

  it("exibe 26 caracteres Crockford em 7 grupos separados por '-'", () => {
    const { display } = generateRecoveryKey();
    expect(display).toMatch(new RegExp(`^${CROCKFORD}{4}(-${CROCKFORD}{4}){5}-${CROCKFORD}{2}$`));
    expect(display.replace(/-/g, "")).toHaveLength(26);
  });

  it("duas chaves geradas diferem", () => {
    const a = generateRecoveryKey();
    const b = generateRecoveryKey();
    expect(a.display).not.toBe(b.display);
    expect(a.bytes).not.toEqual(b.bytes);
  });
});

describe("parseRecoveryKey", () => {
  it("decodifica os extremos do alfabeto Crockford", () => {
    expect(parseRecoveryKey("0000-0000-0000-0000-0000-0000-00")).toEqual(new Uint8Array(16));
    expect(parseRecoveryKey("ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZ")).toEqual(new Uint8Array(16).fill(0xff));
  });

  it("aceita minúsculas, espaços e sem '-'", () => {
    const { display, bytes } = generateRecoveryKey();
    expect(parseRecoveryKey(display.toLowerCase())).toEqual(bytes);
    expect(parseRecoveryKey(display.replace(/-/g, " "))).toEqual(bytes);
    expect(parseRecoveryKey(display.replace(/-/g, ""))).toEqual(bytes);
  });

  it("lê I e L como 1 e O como 0", () => {
    expect(parseRecoveryKey("IIII-llll-OOOO-oooo-1111-0000-10")).toEqual(
      parseRecoveryKey("1111-1111-0000-0000-1111-0000-10"),
    );
  });

  it.each([
    ["caractere inválido U", "U000-0000-0000-0000-0000-0000-00"],
    ["caractere inválido *", "*000-0000-0000-0000-0000-0000-00"],
    ["25 caracteres", "0000-0000-0000-0000-0000-0000-0"],
    ["27 caracteres", "0000-0000-0000-0000-0000-0000-000"],
    ["vazio", ""],
  ])("lança InvalidRecoveryKey com %s", (_label, text) => {
    expect(() => parseRecoveryKey(text)).toThrow(InvalidRecoveryKey);
  });
});

describe("recoveryKek", () => {
  it("é HKDF-SHA256 com info orcamento/recovery/v1, AES-GCM não extraível", async () => {
    const { bytes } = generateRecoveryKey();
    const raw = hkdf(sha256, bytes, new Uint8Array(0), new TextEncoder().encode("orcamento/recovery/v1"), 32);
    const reference = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
    const kek = await recoveryKek(bytes);
    expect(kek.extractable).toBe(false);
    const ct = await encryptField(reference, "dek", "vault.dek.user-1");
    expect(await decryptField(kek, ct, "vault.dek.user-1")).toBe("dek");
  });

  it("outra chave de recuperação não decifra", async () => {
    const kek = await recoveryKek(generateRecoveryKey().bytes);
    const other = await recoveryKek(generateRecoveryKey().bytes);
    const ct = await encryptField(kek, "dek", "vault.dek.user-1");
    await expect(decryptField(other, ct, "vault.dek.user-1")).rejects.toBeInstanceOf(DecryptError);
  });
});
