import { describe, expect, it } from "vitest";
import { createVaultMaterial } from "./create-vault";
import { openBirthDate } from "./open";
import { deriveLoginSecret, unlockVault, WrongPasswordError } from "./unlock-vault";

const PARAMS = { m: 64, t: 1, p: 1 };
const USER = "11111111-1111-4111-8111-111111111111";
const PASSWORD = "senha-forte-123";
const BIRTH = "1990-05-17";

async function signedUp() {
  const created = await createVaultMaterial({ password: PASSWORD, userId: USER, birthDateIso: BIRTH, params: PARAMS });
  const { salt, dekWrappedPw } = created.server.material;
  return { created, salt, dekWrappedPw };
}

describe("unlockVault", () => {
  it("the right password returns a DEK that opens a field sealed at sign-up (SIGILO-13)", async () => {
    const { created, salt, dekWrappedPw } = await signedUp();

    const dek = await unlockVault({ password: PASSWORD, params: PARAMS, salt, dekWrappedPw, userId: USER });

    expect(await openBirthDate(dek, USER, created.server.birthDateCt)).toBe(BIRTH);
  });

  it("a wrong password throws WrongPasswordError (SIGILO-17)", async () => {
    const { salt, dekWrappedPw } = await signedUp();

    await expect(
      unlockVault({ password: "senha-errada-123", params: PARAMS, salt, dekWrappedPw, userId: USER }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("the wrapped DEK of another user does not open (AAD binds the user)", async () => {
    const { salt, dekWrappedPw } = await signedUp();

    await expect(
      unlockVault({ password: PASSWORD, params: PARAMS, salt, dekWrappedPw, userId: "another-user" }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("returns a non-extractable AES-GCM DEK", async () => {
    const { salt, dekWrappedPw } = await signedUp();

    const dek = await unlockVault({ password: PASSWORD, params: PARAMS, salt, dekWrappedPw, userId: USER });

    expect(dek.extractable).toBe(false);
    expect(dek.algorithm.name).toBe("AES-GCM");
    expect([...dek.usages].sort()).toEqual(["decrypt", "encrypt"]);
  });
});

describe("deriveLoginSecret", () => {
  it("matches the authSecret of createVaultMaterial for the same password and salt", async () => {
    const { created, salt } = await signedUp();

    expect(await deriveLoginSecret(PASSWORD, PARAMS, salt)).toBe(created.server.authSecret);
  });

  it("differs for another password with the same salt", async () => {
    const { created, salt } = await signedUp();

    expect(await deriveLoginSecret("senha-errada-123", PARAMS, salt)).not.toBe(created.server.authSecret);
  });
});
