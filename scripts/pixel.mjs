#!/usr/bin/env node
// Sample exact pixels. Usage: node scripts/pixel.mjs <expected|actual> <name> x,y [x,y...]
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");
const [kind = "expected", name, ...pts] = process.argv.slice(2);
const dir = "artifacts/visual-diff";
const file = kind === "actual" ? `${name}.actual.png` : `${name}.expected.png`;
const p = resolve(process.cwd(), dir, file);
if (!existsSync(p)) { console.error("missing", p); process.exit(1); }
const png = PNG.sync.read(readFileSync(p));
const hex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
const box = (x0, y0, w, h) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * png.width + x) * 4; r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
  }
  if (!n) return "----";
  return `${hex(r / n, g / n, b / n)} avg(${w}x${h})`;
};
for (const t of pts) {
  const m = t.match(/^(\d+),(\d+)(?:x(\d+)x(\d+))?$/);
  if (!m) { console.log(t, "bad"); continue; }
  const x = +m[1], y = +m[2];
  if (m[3]) console.log(`${t} => ${box(x, y, +m[3], +m[4] || +m[3])}`);
  else {
    const i = (y * png.width + x) * 4;
    console.log(`${t} => ${hex(png.data[i], png.data[i + 1], png.data[i + 2])}`);
  }
}
