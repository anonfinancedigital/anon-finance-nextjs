import { afterEach, describe, expect, it, vi } from "vitest";

const poolCtor = vi.hoisted(() => vi.fn());
vi.mock("pg", () => ({ Pool: poolCtor }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => ({})) }));

describe("db client pool wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    poolCtor.mockClear();
  });

  it("creates the pool with max 3, idle timeout 10000 and DATABASE_URL on Vercel (HOSTING-01, HOSTING-03, HOSTING-04)", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@host/db");
    await import("./client");
    expect(poolCtor).toHaveBeenCalledWith({
      connectionString: "postgres://u:p@host/db",
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  });

  it("creates the pool with max 10 outside Vercel (HOSTING-02)", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@host/db");
    await import("./client");
    expect(poolCtor).toHaveBeenCalledWith(expect.objectContaining({ max: 10 }));
  });
});
