import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");

const regularSvg = readFileSync(resolve(PUBLIC, "logo.svg"), "utf-8");
const maskableSvg = readFileSync(resolve(PUBLIC, "icon-maskable.svg"), "utf-8");

const sizes = [192, 512];

await Promise.all([
  // Regular icons
  ...sizes.map((size) =>
    sharp(Buffer.from(regularSvg))
      .resize(size, size)
      .png()
      .toFile(resolve(PUBLIC, `icon-${size}x${size}.png`))
  ),
  // Maskable icons
  ...sizes.map((size) =>
    sharp(Buffer.from(maskableSvg))
      .resize(size, size)
      .png()
      .toFile(resolve(PUBLIC, `icon-${size}x${size}.maskable.png`))
  ),
  // Apple touch icon
  sharp(Buffer.from(regularSvg))
    .resize(180, 180)
    .png()
    .toFile(resolve(PUBLIC, "apple-touch-icon.png")),
  // Favicon (small)
  sharp(Buffer.from(regularSvg))
    .resize(48, 48)
    .png()
    .toFile(resolve(PUBLIC, "favicon.png")),
]);

console.log("Generated PWA icons successfully");
