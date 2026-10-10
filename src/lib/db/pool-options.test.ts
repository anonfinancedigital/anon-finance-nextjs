import { describe, expect, it } from "vitest";
import { poolOptions } from "./pool-options";

describe("poolOptions", () => {
  it("caps the pool at 3 connections on Vercel (HOSTING-01)", () => {
    expect(poolOptions({ VERCEL: "1" }).max).toBe(3);
  });

  it("allows 10 connections when VERCEL is unset (HOSTING-02)", () => {
    expect(poolOptions({}).max).toBe(10);
  });

  it("treats an empty VERCEL as unset (HOSTING-02)", () => {
    expect(poolOptions({ VERCEL: "" }).max).toBe(10);
  });

  it("closes idle connections after 10000 ms in both environments (HOSTING-03)", () => {
    expect(poolOptions({ VERCEL: "1" }).idleTimeoutMillis).toBe(10000);
    expect(poolOptions({}).idleTimeoutMillis).toBe(10000);
  });

  it("takes the connection string from DATABASE_URL (HOSTING-04)", () => {
    expect(poolOptions({ DATABASE_URL: "postgres://u:p@h:1/d" }).connectionString).toBe("postgres://u:p@h:1/d");
  });
});
