import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");
const [kind = "expected", name, colsArg, rowsArg] = process.argv.slice(2);
const COLS = Number(colsArg || 16), ROWS = Number(rowsArg || 14);
const root = resolve(process.cwd());
const dir = "artifacts/visual-diff";
const file = kind === "actual" ? `${name}.actual.png` : `${name}.expected.png`;
const p = resolve(root, dir, file);
if (!existsSync(p)) { console.error("missing", p); process.exit(1); }
const png = PNG.sync.read(readFileSync(p));
const W = png.width, H = png.height;
const cw = Math.ceil(W / COLS), ch = Math.ceil(H / ROWS);
const hue = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (d < 24 || l > 235 || l < 20) return l > 235 ? "W" : l < 20 ? "K" : "g";
  let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = ((h * 60) % 360 + 360) % 360;
  if (h < 15 || h >= 345) return "R"; if (h < 45) return "O"; if (h < 70) return "Y";
  if (h < 165) return "G"; if (h < 210) return "C"; if (h < 265) return "B"; if (h < 330) return "P"; return "R";
};
const hex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
console.log(`\n=== ${file} (${W}x${H}) ===`);
for (let gy = 0; gy < ROWS; gy++) {
  let line = "";
  for (let gx = 0; gx < COLS; gx++) {
    const x0 = gx * cw, y0 = gy * ch, w = Math.min(cw, W - x0), h = Math.min(ch, H - y0);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const i = (y * W + x) * 4; const a = png.data[i + 3] / 255;
      r += png.data[i] * a; g += png.data[i + 1] * a; b += png.data[i + 2] * a; n += a;
    }
    if (!n) { line += "...... "; continue; }
    r /= n; g /= n; b /= n;
    line += `${hue(r, g, b)}${hex(r, g, b)} `;
  }
  console.log(line);
}
