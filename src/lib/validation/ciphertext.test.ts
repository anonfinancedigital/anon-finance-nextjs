import { describe, expect, it } from "vitest";
import { ciphertextSchema, nullableCiphertextSchema } from "./ciphertext";

const ok = (value: unknown) => ciphertextSchema.safeParse(value).success;
const withLength = (n: number) => `v1:${"a".repeat(n - 3)}`;

describe("ciphertextSchema", () => {
  it("accepts a v1 payload with base64url characters", () => {
    expect(ok("v1:abc_-")).toBe(true);
  });

  it("accepts exactly 2048 characters", () => {
    expect(withLength(2048)).toHaveLength(2048);
    expect(ok(withLength(2048))).toBe(true);
  });

  it("rejects 2049 characters", () => {
    expect(ok(withLength(2049))).toBe(false);
  });

  it("rejects a payload without the v1: prefix", () => {
    expect(ok("abc")).toBe(false);
  });

  it("rejects another version prefix", () => {
    expect(ok("v2:abc")).toBe(false);
  });

  it("rejects an empty payload", () => {
    expect(ok("v1:")).toBe(false);
    expect(ok("")).toBe(false);
  });

  it.each(["+", "/", "="])("rejects the standard base64 character %s", (char) => {
    expect(ok(`v1:ab${char}cd`)).toBe(false);
  });

  it("rejects a non-string value", () => {
    expect(ok(123)).toBe(false);
    expect(ok(undefined)).toBe(false);
    expect(ok(null)).toBe(false);
  });
});

describe("nullableCiphertextSchema", () => {
  it("accepts null", () => {
    expect(nullableCiphertextSchema.safeParse(null).success).toBe(true);
  });

  it("rejects undefined", () => {
    expect(nullableCiphertextSchema.safeParse(undefined).success).toBe(false);
  });

  it("accepts a valid payload and rejects an invalid one", () => {
    expect(nullableCiphertextSchema.safeParse("v1:abc_-").success).toBe(true);
    expect(nullableCiphertextSchema.safeParse("v2:abc").success).toBe(false);
  });
});
