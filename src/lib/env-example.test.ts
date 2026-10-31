import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const lines = readFileSync(join(process.cwd(), ".env.example"), "utf8").split("\n");

describe(".env.example", () => {
  it.each(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"])(
    "lists %s empty and documented by the comment above it (PUSH-50)",
    (key) => {
      const index = lines.findIndex((l) => l.startsWith(`${key}=`));
      expect(index).toBeGreaterThan(0);
      expect(lines[index]).toBe(`${key}=`);
      expect(lines[index - 1]).toMatch(/^# \S/);
    },
  );

  it("lists each push key exactly once (PUSH-50)", () => {
    for (const key of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"]) {
      expect(lines.filter((l) => l.startsWith(`${key}=`))).toHaveLength(1);
    }
  });
});
