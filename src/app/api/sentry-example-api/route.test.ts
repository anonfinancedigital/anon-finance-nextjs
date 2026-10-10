import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/sentry-example-api", () => {
  it("answers 404 without throwing in production (SENTRY-21)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("throws the example server error outside production (SENTRY-20)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(GET()).rejects.toThrow("Erro de servidor de exemplo do Sentry");
  });
});
