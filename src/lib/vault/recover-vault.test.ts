import { describe, expect, it } from "vitest";
import { InvalidRecoveryKey } from "@/lib/crypto/recovery";
import { createVaultMaterial } from "./create-vault";
import { openBirthDate } from "./open";
import { rewrapWithRecovery } from "./recover-vault";
import { unlockVault, WrongPasswordError } from "./unlock-vault";

const PARAMS = { m: 64, t: 1, p: 1 };
const USER = "11111111-1111-4111-8111-111111111111";
const OLD_PASSWORD = "senha-antiga-123";
const NEW_PASSWORD = "senha-nova-456";
const BIRTH = "1990-05-17";

const signUp = () =>
  createVaultMaterial({ password: OLD_PASSWORD, userId: USER, birthDateIso: BIRTH, params: PARAMS });

describe("rewrapWithRecovery", () => {
  it("the new dekWrappedPw opens with the new password and holds the original DEK (SIGILO-19)", async () => {
    const created = await signUp();

    const result = await rewrapWithRecovery({
      recoveryKeyText: created.recoveryKey,
      dekWrappedRecovery: created.server.material.dekWrappedRecovery,
      newPassword: NEW_PASSWORD,
      userId: USER,
      params: PARAMS,
    });
    const { salt, dekWrappedPw } = result.material;
    const dek = await unlockVault({ password: NEW_PASSWORD, params: PARAMS, salt, dekWrappedPw, userId: USER });

    // The birth date sealed at sign-up opens with the unlocked key: same DEK.
    expect(await openBirthDate(dek, USER, created.server.birthDateCt)).toBe(BIRTH);
    await expect(
      unlockVault({ password: OLD_PASSWORD, params: PARAMS, salt, dekWrappedPw, userId: USER }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
    expect(result.material.dekWrappedRecovery).toBe(created.server.material.dekWrappedRecovery);
  });

  it("accepts the key typed in lower case without dashes", async () => {
    const created = await signUp();

    const result = await rewrapWithRecovery({
      recoveryKeyText: created.recoveryKey.replace(/-/g, "").toLowerCase(),
      dekWrappedRecovery: created.server.material.dekWrappedRecovery,
      newPassword: NEW_PASSWORD,
      userId: USER,
      params: PARAMS,
    });

    expect(result.material.dekWrappedPw).toMatch(/^v1:/);
  });

  it("a malformed recovery key throws InvalidRecoveryKey and returns no material (SIGILO-20)", async () => {
    const created = await signUp();

    await expect(
      rewrapWithRecovery({
        recoveryKeyText: "isto-nao-e-uma-chave",
        dekWrappedRecovery: created.server.material.dekWrappedRecovery,
        newPassword: NEW_PASSWORD,
        userId: USER,
        params: PARAMS,
      }),
    ).rejects.toBeInstanceOf(InvalidRecoveryKey);
  });

  it("a well-formed but wrong recovery key throws InvalidRecoveryKey (SIGILO-20)", async () => {
    const created = await signUp();
    const other = await signUp();

    await expect(
      rewrapWithRecovery({
        recoveryKeyText: other.recoveryKey,
        dekWrappedRecovery: created.server.material.dekWrappedRecovery,
        newPassword: NEW_PASSWORD,
        userId: USER,
        params: PARAMS,
      }),
    ).rejects.toBeInstanceOf(InvalidRecoveryKey);
  });

  it("uses a new salt and the new password's authSecret", async () => {
    const created = await signUp();

    const result = await rewrapWithRecovery({
      recoveryKeyText: created.recoveryKey,
      dekWrappedRecovery: created.server.material.dekWrappedRecovery,
      newPassword: NEW_PASSWORD,
      userId: USER,
      params: PARAMS,
    });

    expect(result.material.salt).not.toBe(created.server.material.salt);
    expect(result.authSecret).not.toBe(created.server.authSecret);
    expect(result.material).toMatchObject({ kdfVersion: 1, memKib: 64, iterations: 1, parallelism: 1 });
  });
});
