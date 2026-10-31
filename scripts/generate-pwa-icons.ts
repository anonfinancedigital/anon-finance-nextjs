// Generates the PWA PNG icons in public/ from public/favicon.svg.
// Usage: npm run pwa:icons
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = join(process.cwd(), "public");
const SOURCE = join(PUBLIC_DIR, "favicon.svg");
const BACKGROUND = "#0D111A";
const SVG_DENSITY = 1024;

async function render(size: number): Promise<Buffer> {
  return sharp(SOURCE, { density: SVG_DENSITY }).resize(size, size).png().toBuffer();
}

/** Maskable art keeps the safe zone: the favicon is shrunk to 60% (20% margin per side) over a solid background. */
async function renderMaskable(size: number): Promise<Buffer> {
  const inner = Math.round(size * 0.6);
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: await render(inner), gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const outputs: [string, Promise<Buffer>][] = [
    ["icon-192.png", render(192)],
    ["icon-512.png", render(512)],
    ["icon-maskable-512.png", renderMaskable(512)],
    ["apple-touch-icon.png", render(180)],
  ];
  for (const [name, buffer] of outputs) {
    await sharp(await buffer).toFile(join(PUBLIC_DIR, name));
    console.log(`Wrote public/${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
