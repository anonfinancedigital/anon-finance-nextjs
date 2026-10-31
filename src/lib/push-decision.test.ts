import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const state = readFileSync(join(process.cwd(), ".specs/STATE.md"), "utf8");

function section(id: string): string {
  const start = state.indexOf(`### ${id}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = state.slice(start + 4).search(/^(### |## )/m);
  return next === -1 ? state.slice(start) : state.slice(start, start + 4 + next);
}

describe(".specs/STATE.md AD-016 (PUSH-51)", () => {
  const ad = section("AD-016");

  it("is active and mentions the AD-013 exception", () => {
    expect(ad).toMatch(/^- \*\*Status\*\*: active$/m);
    expect(ad).toContain("AD-013");
  });

  it("fills decision, reason, trade-off, scope and date", () => {
    for (const field of ["Decision", "Reason", "Trade-off", "Scope", "Date"]) {
      expect(ad).toMatch(new RegExp(`^- \\*\\*${field}\\*\\*: \\S.+$`, "m"));
    }
    expect(ad).toMatch(/^- \*\*Date\*\*: \d{4}-\d{2}-\d{2}$/m);
  });

  it("flags the exception on AD-013 without changing its status", () => {
    const old = section("AD-013");
    expect(old).toContain("AD-016");
    expect(old).toMatch(/^- \*\*Status\*\*: active/m);
  });
});
