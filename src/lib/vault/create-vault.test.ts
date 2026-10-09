import { describe, expect, it } from "vitest";
import { decryptField, encryptField } from "@/lib/crypto/aead";
import { fromBase64Url, toBase64Url } from "@/lib/crypto/base64url";
import { deriveKeys } from "@/lib/crypto/kdf";
import { parseRecoveryKey, recoveryKek } from "@/lib/crypto/recovery";
import { unwrapDek } from "@/lib/crypto/wrap";
import { createVaultMaterial } from "./create-vault";
import { openBirthDate } from "./open";

const PARAMS = { m: 64, t: 1, p: 1 };
const USER = "11111111-1111-4111-8111-111111111111";
const PASSWORD = "senha-forte-123";
const BIRTH = "1990-05-17";

const importRaw = (raw: Uint8Array) =>
  crypto.subtle.importKey("raw", new Uint8Array(raw), "AES-GCM", false, ["encrypt", "decrypt"]);

/** True when `raw` is the same AES key as `dek`: what `dek` seals, `raw` opens. */
async function isSameDek(dek: CryptoKey, raw: Uint8Array): Promise<boolean> {
  const ct = await encryptField(dek, "probe", "probe.aad");
  return decryptField(await importRaw(raw), ct, "probe.aad").then(
    (text) => text === "probe",
    () => false,
  );
}

/** Every leaf of a JSON value. */
function leaves(value: unknown): unknown[] {
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(leaves);
  return [value];
}

describe("createVaultMaterial", () => {
  it("sends the server no password, raw DEK, KEK, recovery key nor plain birth date (SIGILO-02, SIGILO-11)", async () => {
    const created = await createVaultMaterial({ password: PASSWORD, userId: USER, birthDateIso: BIRTH, params: PARAMS });
    const { kek } = await deriveKeys(PASSWORD, fromBase64Url(created.server.material.salt), PARAMS);
    const dekRaw = await unwrapDek(kek, created.server.material.dekWrappedPw, USER);
    const recoveryBytes = parseRecoveryKey(created.recoveryKey);

    const sent = JSON.stringify(created.server);

    for (const secret of [
      PASSWORD,
      toBase64Url(dekRaw),
      Buffer.from(dekRaw).toString("hex"),
      Buffer.from(dekRaw).toString("base64"),
      created.recoveryKey,
      created.recoveryKey.replace(/-/g, ""),
      toBase64Url(recoveryBytes),
      BIRTH,
    ]) {
      expect(sent).not.toContain(secret);
    }
    // No key object (KEK or DEK) travels: every leaf is a plain string or number.
    expect(leaves(created.server).every((leaf) => typeof leaf === "string" || typeof leaf === "number")).toBe(true);
    expect(Object.keys(created.server).sort()).toEqual(["authSecret", "birthDateCt", "material"]);
  });

  it("the KEK of the same password unwraps the DEK it returns", async () => {
    const created = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });
    const { kek } = await deriveKeys(PASSWORD, fromBase64Url(created.server.material.salt), PARAMS);

    const dekRaw = await unwrapDek(kek, created.server.material.dekWrappedPw, USER);

    expect(dekRaw).toHaveLength(32);
    expect(await isSameDek(created.dek, dekRaw)).toBe(true);
  });

  it("the recovery key shown unwraps the same DEK", async () => {
    const created = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });

    const kek = await recoveryKek(parseRecoveryKey(created.recoveryKey));
    const dekRaw = await unwrapDek(kek, created.server.material.dekWrappedRecovery, USER);

    expect(await isSameDek(created.dek, dekRaw)).toBe(true);
  });

  it("records the KDF parameters and an authSecret equal to the password's derivation", async () => {
    const created = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });
    const { material, authSecret } = created.server;
    const derived = await deriveKeys(PASSWORD, fromBase64Url(material.salt), PARAMS);

    expect(material).toMatchObject({ kdfVersion: 1, memKib: 64, iterations: 1, parallelism: 1 });
    expect(fromBase64Url(material.salt)).toHaveLength(16);
    expect(authSecret).toBe(derived.authSecret);
    expect(material.dekWrappedPw).toMatch(/^v1:[A-Za-z0-9_-]+$/);
    expect(material.dekWrappedRecovery).toMatch(/^v1:[A-Za-z0-9_-]+$/);
  });

  it("seals the birth date with the DEK, and sends null without one", async () => {
    const withBirth = await createVaultMaterial({ password: PASSWORD, userId: USER, birthDateIso: BIRTH, params: PARAMS });
    const without = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });

    expect(await openBirthDate(withBirth.dek, USER, withBirth.server.birthDateCt)).toBe(BIRTH);
    expect(without.server.birthDateCt).toBeNull();
  });

  it("two calls produce different DEK, salt and recovery key", async () => {
    const a = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });
    const b = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });
    const dekA = await unwrapDek(
      (await deriveKeys(PASSWORD, fromBase64Url(a.server.material.salt), PARAMS)).kek,
      a.server.material.dekWrappedPw,
      USER,
    );

    expect(a.server.material.salt).not.toBe(b.server.material.salt);
    expect(a.recoveryKey).not.toBe(b.recoveryKey);
    expect(await isSameDek(b.dek, dekA)).toBe(false);
  });

  it("returns the DEK as a non-extractable key", async () => {
    const created = await createVaultMaterial({ password: PASSWORD, userId: USER, params: PARAMS });

    expect(created.dek.extractable).toBe(false);
  });
});
