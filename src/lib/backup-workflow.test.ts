import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(join(process.cwd(), ".github/workflows/backup.yml"), "utf8");
const lines = workflow.split("\n");

describe(".github/workflows/backup.yml", () => {
  it("runs daily at 05:00 UTC and on demand (HOSTING-15)", () => {
    expect(workflow).toMatch(/^on:\n {2}schedule:\n {4}- cron: "0 5 \* \* \*"/m);
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/m);
  });

  it("dumps in custom format without owners, encrypting the stream with age before it touches disk (HOSTING-16)", () => {
    expect(workflow).toContain(
      'pg_dump --format=custom --no-owner "$NEON_DIRECT_URL" | age -r "$AGE_PUB" > "$f"',
    );
    expect(workflow).toContain("NEON_DIRECT_URL: ${{ secrets.NEON_DIRECT_URL }}");
    expect(workflow).toContain("AGE_PUB: ${{ secrets.BACKUP_AGE_PUBLIC_KEY }}");
  });

  it("names the file orcamento-<UTC timestamp>.dump.age and uploads it with 30 days retention (HOSTING-17)", () => {
    expect(workflow).toContain('f="orcamento-$(date -u +%Y%m%dT%H%M%SZ).dump.age"');
    expect(workflow).toMatch(/uses: actions\/upload-artifact@v4\b/);
    expect(workflow).toContain("name: ${{ steps.dump.outputs.file }}");
    expect(workflow).toContain("path: ${{ steps.dump.outputs.file }}");
    expect(workflow).toContain("retention-days: 30");
  });

  it("fails the job on any pipeline or upload error (HOSTING-18)", () => {
    const shells = lines.filter((l) => l.includes("set -euo pipefail"));
    expect(shells).toHaveLength(2); // install step and dump step
    expect(workflow).toContain("if-no-files-found: error");
    expect(workflow).not.toContain("continue-on-error");
    expect(workflow).not.toMatch(/\|\|\s*true/);
  });

  it("fails before the upload when the encrypted file is empty (HOSTING-19)", () => {
    const check = workflow.indexOf('if [ ! -s "$f" ]');
    expect(check).toBeGreaterThan(workflow.indexOf("pg_dump"));
    expect(check).toBeLessThan(workflow.indexOf("actions/upload-artifact"));
    expect(workflow.slice(check, check + 120)).toContain("exit 1");
  });

  it("takes the pg client version from one variable at the top, set to 18 (HOSTING-20)", () => {
    expect(workflow).toMatch(/^env:\n {2}PG_VERSION: 18$/m);
    expect(workflow.indexOf("PG_VERSION: 18")).toBeLessThan(workflow.indexOf("jobs:"));
    expect(workflow).toContain('"postgresql-client-${PG_VERSION}"');
    expect(workflow).not.toMatch(/postgresql-client-\d/);
  });

  it("never prints a secret and never writes or uploads the dump in clear text (HOSTING-21)", () => {
    // Secrets only enter through env: and are never printed, traced or interpolated into a command.
    const runBlocks = lines.filter((l) => !/^\s*(\w+): \$\{\{ secrets\./.test(l));
    for (const line of runBlocks) {
      if (/\b(echo|cat|printf)\b/.test(line)) {
        expect(line).not.toMatch(/NEON_DIRECT_URL|AGE_PUB|secrets\./);
      }
      if (!line.trim().startsWith("#")) expect(line).not.toMatch(/\$\{\{\s*secrets\./);
    }
    expect(workflow).not.toMatch(/set -\w*x/);
    expect(workflow).not.toContain("ACTIONS_STEP_DEBUG");
    // Every file written after pg_dump goes through age; the only upload path is the encrypted file.
    const dumpLines = lines.filter((l) => l.trim().startsWith("pg_dump"));
    expect(dumpLines).toHaveLength(1);
    expect(dumpLines[0]).toMatch(/\| age -r "\$AGE_PUB" > "\$f"$/);
    expect(dumpLines[0]).not.toMatch(/-f |--file/);
    expect(workflow).not.toMatch(/Z\)\.dump(?!\.age)|\.dump["' ]/);
    expect(workflow).toContain("path: ${{ steps.dump.outputs.file }}");
  });
});
