import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PNG_SIGNATURE = "89504e470d0a1a0a";

/** Width and height from the IHDR chunk, which always follows the 8-byte PNG signature. */
function pngSize(file: string) {
  const bytes = readFileSync(join(process.cwd(), "public", file));
  expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE);
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("PWA icons (PWA-02, PWA-03)", () => {
  it.each([
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ])("%s is a %ipx square PNG", (file, size) => {
    expect(pngSize(file)).toEqual({ width: size, height: size });
  });
});
