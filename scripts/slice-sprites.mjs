import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import fs from "node:fs";

const SRC = "scripts/assets/SandyPose.source.png";
const OUT = "public/dog-sprites.png";

const img = await Jimp.read(SRC);
const { width, height, data } = img.bitmap;

function getPx(x, y) {
  return intToRGBA(img.getPixelColor(x, y));
}

// Rough regions found via band-detection (row band, col band) for the 8 dog poses.
const REGIONS = {
  walk: [
    [45, 148, 372, 457],
    [406, 148, 738, 457],
    [786, 148, 1114, 457],
    [1163, 148, 1488, 457],
  ],
  run: [
    [23, 620, 366, 898],
    [430, 620, 707, 898],
    [760, 620, 1127, 898],
    [1173, 620, 1493, 898],
  ],
};

const THRESHOLD = 18;

function tightBBox([x0, y0, x1, y1]) {
  let minX = x1, maxX = x0, minY = y1, maxY = y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const { r, g, b } = getPx(x, y);
      if (r > THRESHOLD || g > THRESHOLD || b > THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

const allBoxes = [];
for (const key of ["walk", "run"]) {
  for (const region of REGIONS[key]) {
    const box = tightBBox(region);
    allBoxes.push({ key, box, w: box[2] - box[0] + 1, h: box[3] - box[1] + 1 });
  }
}
console.log(allBoxes.map((b) => ({ key: b.key, w: b.w, h: b.h })));

const PAD = 6;
const targetW = Math.max(...allBoxes.map((b) => b.w)) + PAD * 2;
const targetH = Math.max(...allBoxes.map((b) => b.h)) + PAD * 2;
console.log("target frame size", targetW, targetH);

const cols = 4;
const rows = 2;
const sheet = new Jimp({ width: targetW * cols, height: targetH * rows, color: 0x00000000 });

function keyedAlpha(r, g, b) {
  // Smoothly fade near-black background to transparent; keep foreground opaque.
  const luma = Math.max(r, g, b);
  const lo = 10, hi = 40;
  const a = Math.max(0, Math.min(255, ((luma - lo) / (hi - lo)) * 255));
  return a;
}

allBoxes.forEach((b, i) => {
  const [x0, y0, x1, y1] = b.box;
  const w = b.w, h = b.h;
  const offsetX = Math.round((targetW - w) / 2);
  const offsetY = targetH - PAD - h; // align feet/bottom consistently
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { r, g, b: bl } = getPx(x0 + x, y0 + y);
      const a = keyedAlpha(r, g, bl);
      if (a <= 0) continue;
      const color = rgbaToInt(r, g, bl, Math.round(a));
      const row = i < 4 ? 0 : 1;
      const col = i % 4;
      sheet.setPixelColor(color, col * targetW + offsetX + x, row * targetH + offsetY + y);
    }
  }
});

await sheet.write(OUT);
fs.writeFileSync(
  "src/sprite-meta.json",
  JSON.stringify({ frameWidth: targetW, frameHeight: targetH, cols, rows }, null, 2)
);
console.log("done", targetW, targetH);
