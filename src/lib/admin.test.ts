import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail } from "./admin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAdminEmail", () => {
  it("matches ADMIN_EMAIL ignoring case and surrounding spaces", () => {
    vi.stubEnv("ADMIN_EMAIL", " Admin@Example.com ");
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("  ADMIN@example.COM  ")).toBe(true);
  });

  it("returns false for another e-mail", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    expect(isAdminEmail("ana@example.com")).toBe(false);
  });

  it("reads ADMIN_EMAIL on every call", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    expect(isAdminEmail("admin@example.com")).toBe(true);
    vi.stubEnv("ADMIN_EMAIL", "outro@example.com");
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });

  it.each([[undefined], [""], ["   "]])("returns false for any e-mail when ADMIN_EMAIL is %j", (value) => {
    vi.stubEnv("ADMIN_EMAIL", value);
    expect(isAdminEmail("admin@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
  });
});
