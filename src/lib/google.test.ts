import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleEnabled } from "./google";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isGoogleEnabled", () => {
  it("is true when both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "segredo");
    expect(isGoogleEnabled()).toBe(true);
  });

  it.each([[undefined], [""], ["   "]])("is false with only the id (secret %j)", (secret) => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", secret);
    expect(isGoogleEnabled()).toBe(false);
  });

  it.each([[undefined], [""], ["   "]])("is false with only the secret (id %j)", (id) => {
    vi.stubEnv("GOOGLE_CLIENT_ID", id);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "segredo");
    expect(isGoogleEnabled()).toBe(false);
  });

  it.each([[undefined], [""], ["   "]])("is false when both are %j", (value) => {
    vi.stubEnv("GOOGLE_CLIENT_ID", value);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", value);
    expect(isGoogleEnabled()).toBe(false);
  });
});
