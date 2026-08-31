#!/usr/bin/env node
/**
 * Export key Figma frames as PNG references (not used at runtime).
 * Usage (repo root):
 *   node scripts/export-screenshots.mjs [FILE_KEY_OR_URL]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, resolveFileKey, figmaGet, BENCHMARK_FRAMES, pickFrame } from "./lib/figma.mjs";

const root = resolve(process.cwd());
initFigma(root);

const { summary, fileKey } = resolveFileKey(root, process.argv[2]);
if (!fileKey) {
  console.error("No Figma summary found.");
  process.exit(1);
}

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error("FIGMA_ACCESS_TOKEN missing in .env");
  process.exit(1);
}

const frames = summary?.pages?.[0]?.frames || [];
const unique = [];
const seen = new Set();
for (const spec of BENCHMARK_FRAMES) {
  const frame = pickFrame(frames, spec);
  if (!frame || seen.has(frame.name)) continue;
  seen.add(frame.name);
  unique.push(frame);
}

if (!unique.length) {
  console.error("No matching frames to export");
  process.exit(1);
}

const ids = unique.map((f) => f.id).join(",");
const data = await figmaGet(
  `/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=1`,
  token,
);

const outDir = resolve(root, "imports/figma/screens");
mkdirSync(outDir, { recursive: true });

const images = data.images || {};
for (const frame of unique) {
  const imageUrl = images[frame.id];
  if (!imageUrl) {
    console.warn("no image for", frame.name, frame.id);
    continue;
  }
  const imgRes = await fetch(imageUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const safe = frame.name.replace(/[\\/:*?"<>|]/g, "_");
  const dest = resolve(outDir, `${safe}.png`);
  writeFileSync(dest, buf);
  console.log("saved", dest, buf.length, "bytes");
}

console.log("done", unique.length, "frames");
