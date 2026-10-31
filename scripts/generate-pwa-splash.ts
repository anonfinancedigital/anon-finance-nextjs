// Generates the iOS splash (apple-touch-startup-image) PNGs in public/splash/ from public/favicon.svg.
// Usage: npm run pwa:splash
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { SPLASH_DEVICES, splashFile } from "../src/lib/pwa/splash-list";

const PUBLIC_DIR = join(process.cwd(), "public");
const SOURCE = join(PUBLIC_DIR, "favicon.svg");
const BACKGROUND = "#0D111A";
const SVG_DENSITY = 1024;
const MARK_WIDTH_RATIO = 0.3;

async function main() {
  mkdirSync(join(PUBLIC_DIR, "splash"), { recursive: true });
  for (const device of SPLASH_DEVICES) {
    const width = device.width * device.ratio;
    const height = device.height * device.ratio;
    const mark = Math.round(width * MARK_WIDTH_RATIO);
    const input = await sharp(SOURCE, { density: SVG_DENSITY }).resize(mark, mark).png().toBuffer();
    const file = splashFile(device);
    await sharp({ create: { width, height, channels: 4, background: BACKGROUND } })
      .composite([{ input, gravity: "center" }])
      .png()
      .toFile(join(PUBLIC_DIR, file));
    console.log(`Wrote public${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
