import { describe, expect, it, vi } from "vitest";

// Falha se qualquer módulo carregar o cliente do banco (HOSTING-07).
vi.mock("@/lib/db/client", () => {
  throw new Error("db client must not be imported by /api/health");
});

const { GET } = await import("./route");

describe("GET /api/health", () => {
  it("answers 200 with {status:ok} as JSON (HOSTING-05)", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("is not cacheable (HOSTING-08)", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers the same when called with a query string (edge case)", async () => {
    const response = await (GET as (request: Request) => Promise<Response>)(
      new Request("http://localhost/api/health?probe=1"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
