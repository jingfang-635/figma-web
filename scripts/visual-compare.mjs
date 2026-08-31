#!/usr/bin/env node
/**
 * Region-level AI diff report for visual gate outputs.
 *
 * Reads artifacts/visual-diff/*.{expected,actual,diff}.png produced by
 * visual-gate.mjs and writes artifacts/visual-diff/REPORT.md (+ JSON) that
 * lists the top differing regions per screen with:
 *   - region coordinates (x, y, w, h in viewport px)
 *   - expected vs actual average color (hex) + delta
 *   - hue-direction hint (e.g. "green->red") for quick AI diagnosis
 *
 * Usage (repo root, after npm run visual:gate):
 *   node scripts/visual-compare.mjs          # writes REPORT.md + console summary
 *   node scripts/visual-compare.mjs --json   # also write report.json
 * Env:
 *   COMPARE_GRID_COLS / COMPARE_GRID_ROWS  (default 6 x 9)
 *   COMPARE_TOP_N                          (default 14 regions per screen)
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const root = resolve(process.cwd());
const outDir = resolve(root, "artifacts/visual-diff");
const GRID_COLS = Number(process.env.COMPARE_GRID_COLS || 6);
const GRID_ROWS = Number(process.env.COMPARE_GRID_ROWS || 9);
const TOP_N = Number(process.env.COMPARE_TOP_N || 14);
const MIN_MISMATCH = Number(process.env.COMPARE_MIN_MISMATCH || 0.004); // 0.4% of region px

if (!existsSync(outDir)) {
  console.error(`Missing ${outDir}. Run npm run visual:gate first.`);
  process.exit(1);
}

// ---- color helpers -------------------------------------------------------
function rgb2hex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hueName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d < 24 || l > 235 || l < 20) {
    if (l > 235) return "white";
    if (l < 20) return "black";
    return "gray";
  }
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 165) return "green";
  if (h < 210) return "cyan";
  if (h < 265) return "blue";
  if (h < 330) return "purple";
  return "red";
}

function avgColor(png, x0, y0, w, h) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * png.width + x) * 4;
      const a = png.data[i + 3] / 255;
      if (a === 0) continue;
      r += png.data[i] * a;
      g += png.data[i + 1] * a;
      b += png.data[i + 2] * a;
      n += a;
    }
  }
  if (!n) return { hex: "#00000000", r: 0, g: 0, b: 0 };
  return { hex: rgb2hex(r / n, g / n, b / n), r: r / n, g: g / n, b: b / n };
}

function delta(c1, c2) {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2) / 441; // 0..1
}

// ---- image loading -------------------------------------------------------
function loadPng(name) {
  const p = resolve(outDir, `${name}.png`);
  return existsSync(p) ? PNG.sync.read(readFileSync(p)) : null;
}

const score = existsSync(resolve(outDir, "score.json"))
  ? JSON.parse(readFileSync(resolve(outDir, "score.json"), "utf8"))
  : { scores: [] };

const targets = score.scores
  .map((s) => s.name)
  .filter((n) => loadPng(`${n}.expected`) && loadPng(`${n}.actual`));

if (!targets.length) {
  console.error("No valid gate outputs found in", outDir);
  process.exit(1);
}

// ---- region analysis -----------------------------------------------------
function analyze(name) {
  const exp = loadPng(`${name}.expected`);
  const act = loadPng(`${name}.actual`);
  const width = Math.min(exp.width, act.width);
  const height = Math.min(exp.height, act.height);
  const cw = Math.ceil(width / GRID_COLS);
  const ch = Math.ceil(height / GRID_ROWS);
  const regions = [];

  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const x0 = gx * cw;
      const y0 = gy * ch;
      const w = Math.min(cw, width - x0);
      const h = Math.min(ch, height - y0);
      if (w <= 0 || h <= 0) continue;
      let mismatch = 0;
      const { hex: hexE, r: re, g: ge, b: be } = avgColor(exp, x0, y0, w, h);
      const { hex: hexA, r: ra, g: ga, b: ba } = avgColor(act, x0, y0, w, h);
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const i = (y * width + x) * 4;
          const dr = exp.data[i] - act.data[i];
          const dg = exp.data[i + 1] - act.data[i + 1];
          const db = exp.data[i + 2] - act.data[i + 2];
          if (dr * dr + dg * dg + db * db > 2500) mismatch++;
        }
      }
      const ratio = mismatch / (w * h);
      if (ratio < MIN_MISMATCH) continue;
      regions.push({
        x: x0, y: y0, w, h,
        mismatch,
        ratio,
        hexExpected: hexE,
        hexActual: hexA,
        delta: delta({ r: re, g: ge, b: be }, { r: ra, g: ga, b: ba }),
        hueExpected: hueName(re, ge, be),
        hueActual: hueName(ra, ga, ba),
      });
    }
  }

  regions.sort((a, b) => b.ratio - a.ratio);
  return { width, height, regions: regions.slice(0, TOP_N), regionCount: regions.length };
}

// ---- report --------------------------------------------------------------
const results = {};
let md = `# 视觉差异报告（AI 对比输入）\n\n`;
md += `生成时间：${new Date().toISOString()}\n\n`;
md += `网格：${GRID_COLS}×${GRID_ROWS}，每屏显示 TOP ${TOP_N} 差异区域。\n`;
md += `"hue→hue" 表示该区域平均色相从期望(Fig设计)变到实际(渲染)。\n\n`;

for (const t of targets) {
  const scoreRow = score.scores.find((s) => s.name === t);
  const a = analyze(t);
  results[t] = a;
  md += `\n## ${t} — ssim=${scoreRow?.ssim?.toFixed?.(4) ?? "-"} mismatch=${((scoreRow?.ratio ?? 0) * 100).toFixed(2)}% ${scoreRow?.pass ? "PASS" : "FAIL"}\n`;
  md += `\n| 区域 | 位置(x,y) 尺寸(w×h) | 差异占比 | Δcolor | 期望均值 | 实际均值 | 色相变化 |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const r of a.regions) {
    const gx = Math.floor(r.x / (a.width / GRID_COLS));
    const gy = Math.floor(r.y / (a.height / GRID_ROWS));
    md += `| R${gx}-${gy} | (${r.x},${r.y}) ${r.w}×${r.h} | ${(r.ratio * 100).toFixed(1)}% | ${r.delta.toFixed(2)} | ${r.hexExpected} ${r.hueExpected} | ${r.hexActual} ${r.hueActual} | ${r.hueExpected}→${r.hueActual} |\n`;
  }
  if (!a.regions.length) md += `_无显著差异区域_（仍有少量像素差或纯文字位移）\n`;
}

const reportPath = resolve(outDir, "REPORT.md");
writeFileSync(reportPath, md, "utf8");
console.log(`Wrote ${reportPath}`);

if (process.argv.includes("--json")) {
  writeFileSync(resolve(outDir, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), "utf8");
}

// console summary
console.log("\n===== 差异摘要 =====");
for (const t of targets) {
  const a = results[t];
  const scoreRow = score.scores.find((s) => s.name === t);
  console.log(`\n[${t}] ssim=${scoreRow?.ssim?.toFixed?.(4) ?? "-"} mismatch=${((scoreRow?.ratio ?? 0) * 100).toFixed(2)}%`);
  for (const r of a.regions.slice(0, 6)) {
    console.log(`  R@(${r.x},${r.y}) ${(r.ratio * 100).toFixed(1)}% ${r.hexExpected}${r.hueExpected}→${r.hexActual}${r.hueActual}`);
  }
}
