import { describe, expect, it } from "vitest";
import { resolveBaseUrl } from "./base-url";

describe("resolveBaseUrl in production", () => {
  it("accepts an https URL (HOSTING-13)", () => {
    expect(resolveBaseUrl("https://app.vercel.app", "production")).toBe("https://app.vercel.app");
  });

  it("rejects an http URL (HOSTING-10)", () => {
    expect(resolveBaseUrl("http://app.vercel.app", "production")).toBeNull();
  });

  it("rejects an empty value (HOSTING-10)", () => {
    expect(resolveBaseUrl("", "production")).toBeNull();
  });

  it("rejects an unset value (HOSTING-10)", () => {
    expect(resolveBaseUrl(undefined, "production")).toBeNull();
  });

  it("rejects a value that is not a URL (HOSTING-10)", () => {
    expect(resolveBaseUrl("app", "production")).toBeNull();
  });

  it("rejects other protocols (HOSTING-10)", () => {
    expect(resolveBaseUrl("ftp://app.vercel.app", "production")).toBeNull();
  });

  it("drops a trailing slash so the link has no double slash (edge case)", () => {
    expect(resolveBaseUrl("https://app.vercel.app/", "production")).toBe("https://app.vercel.app");
  });
});

describe("resolveBaseUrl outside production", () => {
  it("accepts an http URL (HOSTING-14)", () => {
    expect(resolveBaseUrl("http://localhost:3000", "development")).toBe("http://localhost:3000");
    expect(resolveBaseUrl("http://localhost:3000", "test")).toBe("http://localhost:3000");
  });
});
