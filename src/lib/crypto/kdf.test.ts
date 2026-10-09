import { argon2id } from "@noble/hashes/argon2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { describe, expect, it } from "vitest";
import { DecryptError, decryptField, encryptField } from "./aead";
import { fromBase64Url, toBase64Url } from "./base64url";
import { DEFAULT_KDF_PARAMS, deriveKeys } from "./kdf";

// Parâmetros baixos para a suíte ficar rápida; os de produção ficam em DEFAULT_KDF_PARAMS.
const FAST = { m: 64, t: 1, p: 1 };
const SALT = Uint8Array.from({ length: 16 }, (_, i) => i);
const OTHER_SALT = Uint8Array.from({ length: 16 }, (_, i) => 16 - i);
const AAD = "vault.dek.user-1";

/** Argon2id + HKDF-SHA256 computed outside the code under test, for a given HKDF info. */
function referenceBytes(password: string, info: string): Uint8Array {
  const ikm = argon2id(password, SALT, { ...FAST, dkLen: 32 });
  return hkdf(sha256, ikm, new Uint8Array(0), new TextEncoder().encode(info), 32);
}

function importAesKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new Uint8Array(bytes), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

describe("deriveKeys", () => {
  it("mesmos senha, salt e parâmetros dão o mesmo authSecret", async () => {
    const a = await deriveKeys("senha-forte-1", SALT, FAST);
    const b = await deriveKeys("senha-forte-1", SALT, FAST);
    expect(a.authSecret).toBe(b.authSecret);
  });

  it("salt diferente dá outro authSecret", async () => {
    const a = await deriveKeys("senha-forte-1", SALT, FAST);
    const b = await deriveKeys("senha-forte-1", OTHER_SALT, FAST);
    expect(a.authSecret).not.toBe(b.authSecret);
  });

  it("senha diferente dá outro authSecret", async () => {
    const a = await deriveKeys("senha-forte-1", SALT, FAST);
    const b = await deriveKeys("senha-forte-2", SALT, FAST);
    expect(a.authSecret).not.toBe(b.authSecret);
  });

  it("authSecret tem 43 caracteres do alfabeto base64url", async () => {
    const { authSecret } = await deriveKeys("senha-forte-1", SALT, FAST);
    expect(authSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("authSecret é Argon2id seguido de HKDF-SHA256 com info orcamento/auth/v1", async () => {
    const ikm = argon2id("senha-forte-1", SALT, { ...FAST, dkLen: 32 });
    const expected = toBase64Url(hkdf(sha256, ikm, new Uint8Array(0), new TextEncoder().encode("orcamento/auth/v1"), 32));
    const { authSecret } = await deriveKeys("senha-forte-1", SALT, FAST);
    expect(authSecret).toBe(expected);
  });

  it("KEK é AES-GCM de 256 bits não extraível", async () => {
    const { kek } = await deriveKeys("senha-forte-1", SALT, FAST);
    expect(kek.extractable).toBe(false);
    expect(kek.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect([...kek.usages].sort()).toEqual(["decrypt", "encrypt"]);
  });

  it("dados cifrados com a KEK de uma senha não decifram com a KEK de outra", async () => {
    const { kek } = await deriveKeys("senha-forte-1", SALT, FAST);
    const { kek: sameKek } = await deriveKeys("senha-forte-1", SALT, FAST);
    const { kek: otherKek } = await deriveKeys("senha-forte-2", SALT, FAST);
    const ct = await encryptField(kek, "segredo", "vault.dek.user-1");
    expect(await decryptField(sameKek, ct, "vault.dek.user-1")).toBe("segredo");
    await expect(decryptField(otherKek, ct, "vault.dek.user-1")).rejects.toBeInstanceOf(DecryptError);
  });
});

describe("deriveKeys: separação de domínio entre KEK e authSecret", () => {
  it("KEK é Argon2id seguido de HKDF-SHA256 com info orcamento/kek/v1", async () => {
    const reference = await importAesKey(referenceBytes("senha-forte-1", "orcamento/kek/v1"));
    const { kek } = await deriveKeys("senha-forte-1", SALT, FAST);
    const ct = await encryptField(reference, "segredo", AAD);
    expect(await decryptField(kek, ct, AAD)).toBe("segredo");
  });

  it("os bytes do authSecret, usados como chave AES-GCM, não abrem o que a KEK cifrou", async () => {
    const { authSecret, kek } = await deriveKeys("senha-forte-1", SALT, FAST);
    const authKey = await importAesKey(fromBase64Url(authSecret));
    const ct = await encryptField(kek, "segredo", AAD);
    await expect(decryptField(authKey, ct, AAD)).rejects.toBeInstanceOf(DecryptError);
  });

  it("uma chave derivada com o info do authSecret não abre o que a KEK cifrou", async () => {
    const authInfoKey = await importAesKey(referenceBytes("senha-forte-1", "orcamento/auth/v1"));
    const { kek } = await deriveKeys("senha-forte-1", SALT, FAST);
    const ct = await encryptField(kek, "segredo", AAD);
    await expect(decryptField(authInfoKey, ct, AAD)).rejects.toBeInstanceOf(DecryptError);
  });
});

describe("DEFAULT_KDF_PARAMS", () => {
  it("usa os parâmetros de produção (64 MiB, 3 iterações, paralelismo 1)", () => {
    expect(DEFAULT_KDF_PARAMS).toEqual({ m: 65536, t: 3, p: 1 });
  });
});
