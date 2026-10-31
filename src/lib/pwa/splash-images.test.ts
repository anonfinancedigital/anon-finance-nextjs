import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { SPLASH_DEVICES, splashFile } from "./splash-list";

const PNG_SIGNATURE = "89504e470d0a1a0a";
const BACKGROUND = [0x0d, 0x11, 0x1a];

function pngPath(device: (typeof SPLASH_DEVICES)[number]) {
  return join(process.cwd(), "public", splashFile(device));
}

/** Width and height from the IHDR chunk, which always follows the 8-byte PNG signature. */
function pngSize(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE);
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function decode(path: string) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => {
    const offset = (y * info.width + x) * info.channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  return { width: info.width, height: info.height, pixel };
}

describe.each(SPLASH_DEVICES)("iOS splash $width x $height @$ratio (SPLASH-03, SPLASH-04)", (device) => {
  const path = pngPath(device);

  it("exists in public/splash/", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("is W*R by H*R pixels (SPLASH-03)", () => {
    expect(pngSize(path)).toEqual({ width: device.width * device.ratio, height: device.height * device.ratio });
  });

  it("has #0D111A in the four corners and the mark in the center (SPLASH-04)", async () => {
    const { width, height, pixel } = await decode(path);
    for (const [x, y] of [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ]) {
      expect(pixel(x, y)).toEqual(BACKGROUND);
    }
    const half = Math.round(width * 0.05);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    let differs = false;
    for (let y = cy - half; y <= cy + half && !differs; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        if (pixel(x, y).some((v, i) => v !== BACKGROUND[i])) {
          differs = true;
          break;
        }
      }
    }
    expect(differs).toBe(true);
  });

  it("centers the mark: its bounding box center is within 1% of the image center (SPLASH-04)", async () => {
    const { width, height, pixel } = await decode(path);
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixel(x, y).some((v, i) => v !== BACKGROUND[i])) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    expect(maxX).toBeGreaterThanOrEqual(0);
    expect(Math.abs((minX + maxX) / 2 - (width - 1) / 2)).toBeLessThanOrEqual(width * 0.01);
    expect(Math.abs((minY + maxY) / 2 - (height - 1) / 2)).toBeLessThanOrEqual(width * 0.01);
  });
});
