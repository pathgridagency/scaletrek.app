// One-off: regenerate the native Android launcher icons + splash logos from
// ScaleTrek_AppIcon.svg. Run before `gradlew assembleRelease` so the new icon
// is baked into the APK (gradle does not re-derive these from app.config.ts).
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Paths are derived from this script's own location so it works regardless of
// where the repo is checked out.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SVG = path.join(ROOT, 'ScaleTrek_AppIcon.svg');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const svg = fs.readFileSync(SVG);

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const make = (size) =>
  sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain', background: transparent });

// Legacy launcher icon (square + round share the same render).
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
// Adaptive-icon foreground layer is 108dp; full-bleed (matches Expo output).
const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [d, sz] of Object.entries(legacy)) {
  await make(sz).webp({ quality: 95 }).toFile(`${RES}/mipmap-${d}/ic_launcher.webp`);
  await make(sz).webp({ quality: 95 }).toFile(`${RES}/mipmap-${d}/ic_launcher_round.webp`);
  console.log(`  ic_launcher ${d} ${sz}px`);
}
for (const [d, sz] of Object.entries(foreground)) {
  await make(sz).webp({ quality: 95 }).toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.webp`);
  console.log(`  ic_launcher_foreground ${d} ${sz}px`);
}

// Splash logo — keep each density's existing dimensions.
for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const p = `${RES}/drawable-${d}/splashscreen_logo.png`;
  if (!fs.existsSync(p)) continue;
  const meta = await sharp(p).metadata();
  await sharp(svg, { density: 384 })
    .resize(meta.width, meta.height, { fit: 'contain', background: transparent })
    .png()
    .toFile(`${p}.tmp`);
  fs.renameSync(`${p}.tmp`, p);
  console.log(`  splashscreen_logo ${d} ${meta.width}x${meta.height}`);
}
console.log('done.');
