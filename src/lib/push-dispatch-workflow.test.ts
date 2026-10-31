import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(join(process.cwd(), ".github/workflows/push-dispatch.yml"), "utf8");
const lines = workflow.split("\n");

describe(".github/workflows/push-dispatch.yml", () => {
  it("runs hourly at minute 7 and on demand (PUSH-47)", () => {
    expect(workflow).toMatch(/^on:\n {2}schedule:\n {4}- cron: "7 \* \* \* \*"/m);
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/m);
    expect(workflow).toMatch(/^permissions:\n {2}contents: read$/m);
  });

  it("POSTs the dispatch endpoint with curl --fail --silent --show-error and a bearer token from env (PUSH-48)", () => {
    expect(workflow).toContain("APP_URL: ${{ secrets.APP_URL }}");
    expect(workflow).toContain("CRON_SECRET: ${{ secrets.CRON_SECRET }}");
    const curl = lines.filter((l) => l.includes("curl"));
    expect(curl).toHaveLength(1);
    expect(curl[0]).toContain("curl --fail --silent --show-error");
    expect(curl[0]).toContain("-X POST");
    expect(curl[0]).toContain('"${APP_URL}/api/push/dispatch"');
    expect(curl[0]).toContain('-H "Authorization: Bearer ${CRON_SECRET}"');
    expect(workflow).toContain("set -euo pipefail");
  });

  it("never prints the secret, the URL or the response, and never masks a failure (PUSH-49)", () => {
    const curl = lines.find((l) => l.includes("curl")) ?? "";
    expect(curl).toContain("--output /dev/null");
    expect(curl).not.toMatch(/\s-\w*v\b|--verbose|--include|-i\b/);
    expect(workflow).not.toMatch(/\b(echo|printf|cat)\b/);
    expect(workflow).not.toMatch(/set -\w*x/);
    expect(workflow).not.toContain("ACTIONS_STEP_DEBUG");
    expect(workflow).not.toContain("continue-on-error");
    expect(workflow).not.toMatch(/\|\|\s*true/);
    // Secrets only enter through env:, never interpolated into a command line.
    for (const line of lines) {
      if (!line.trim().startsWith("#") && !/^\s*\w+: \$\{\{ secrets\./.test(line)) {
        expect(line).not.toMatch(/\$\{\{\s*secrets\./);
      }
    }
  });
});
