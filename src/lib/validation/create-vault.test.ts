import { describe, expect, it } from "vitest";
import { createVaultFormSchema, createVaultPayloadSchema } from "./create-vault";

const form = { password: "12345678", confirmPassword: "12345678", birthDate: "18/09/1993" };

const vault = {
  kdfVersion: 1 as const,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  memKib: 19456,
  iterations: 2,
  parallelism: 1,
  dekWrappedPw: "v1:abc",
  dekWrappedRecovery: "v1:def",
};
const payload = { vault, birthDateCt: "v1:xyz" };

function messages(input: unknown) {
  const result = createVaultFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("createVaultFormSchema", () => {
  it("accepts a valid form and turns the birth date into ISO", () => {
    expect(createVaultFormSchema.parse(form)).toEqual({ ...form, birthDate: "1993-09-18" });
  });

  it("rejects a 7-character password", () => {
    expect(messages({ ...form, password: "1234567", confirmPassword: "1234567" })).toEqual([
      "A senha deve ter pelo menos 8 caracteres",
    ]);
  });

  it("rejects a 129-character password", () => {
    const password = "a".repeat(129);
    expect(messages({ ...form, password, confirmPassword: password })).toEqual([
      "A senha deve ter no máximo 128 caracteres",
    ]);
  });

  it("rejects a different confirmation", () => {
    expect(messages({ ...form, confirmPassword: "87654321" })).toEqual(["As senhas não coincidem"]);
  });

  it("rejects an invalid birth date", () => {
    expect(messages({ ...form, birthDate: "99/99/9999" })).toHaveLength(1);
    expect(messages({ ...form, birthDate: undefined })).toEqual(["Informe a data de nascimento"]);
  });
});

describe("createVaultPayloadSchema", () => {
  it("accepts wrapped and sealed values only", () => {
    expect(createVaultPayloadSchema.parse(payload)).toEqual(payload);
  });

  it.each(["password", "kek", "dek"])("rejects an extra plaintext field %s", (field) => {
    expect(createVaultPayloadSchema.safeParse({ ...payload, [field]: "segredo" }).success).toBe(false);
  });

  it("rejects a malformed vault", () => {
    expect(
      createVaultPayloadSchema.safeParse({ ...payload, vault: { ...vault, salt: "curto" } }).success,
    ).toBe(false);
  });
});
