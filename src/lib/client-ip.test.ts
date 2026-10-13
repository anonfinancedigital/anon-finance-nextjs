import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, hashIp } from "./client-ip";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("takes the first x-forwarded-for item, trimmed", () => {
    expect(clientIp(headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": " 198.51.100.1 " }))).toBe("198.51.100.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is empty", () => {
    expect(clientIp(headers({ "x-forwarded-for": "  ", "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
  });

  it("is null without headers", () => {
    expect(clientIp(headers({}))).toBeNull();
  });

  it("is null when the headers are blank", () => {
    expect(clientIp(headers({ "x-forwarded-for": "", "x-real-ip": "  " }))).toBeNull();
  });
});

describe("hashIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is stable: same IP and secret give the same 64-hex hash", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-a");
    const hash = hashIp("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("203.0.113.7")).toBe(hash);
  });

  it("gives different hashes for different IPs", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-a");
    expect(hashIp("203.0.113.7")).not.toBe(hashIp("203.0.113.8"));
  });

  it("is keyed: a different secret gives a different hash", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-a");
    const a = hashIp("203.0.113.7");
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-b");
    expect(hashIp("203.0.113.7")).not.toBe(a);
  });

  it("does not contain the clear IP", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-a");
    expect(hashIp("203.0.113.7")).not.toContain("203.0.113.7");
  });

  it("throws without BETTER_AUTH_SECRET", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    expect(() => hashIp("203.0.113.7")).toThrow();
  });
});
