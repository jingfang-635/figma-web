#!/usr/bin/env node
/**
 * Export ALL Figma frames (21 screens + 7 modals) as PNG references.
 * Run after the Figma API rate limit (429) has cleared:
 *   node scripts/export-all-screens.mjs [FILE_KEY_OR_URL]
 * Then re-align each screen's fields against imports/figma/screens/*.png
 * and update scripts/lib/screen-catalog.mjs before rerunning visual:all.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, resolveFileKey, figmaGet } from "./lib/figma.mjs";
import { mapPool, concurrencyFromEnv } from "./lib/concurrency.mjs";

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

const SKIP = new Set(["icon", "svg-icon", "激活页面"]);
const frames = (summary?.pages?.[0]?.frames || []).filter((f) => {
  if (SKIP.has(f.name)) return false;
  if (f.name === "sidebar" && f.type !== "COMPONENT") return false;
  return Boolean((f.size?.w ?? f.w) >= 400 || f.name === "sidebar");
});

if (!frames.length) {
  console.error("No frames to export");
  process.exit(1);
}

// 分块调用，避免单请求过大
const CHUNK = 10;
const images = {};
const chunks = [];
for (let i = 0; i < frames.length; i += CHUNK) chunks.push(frames.slice(i, i + CHUNK));
// 块间并发：图片生成在 Figma 服务端，串行块等于把服务端渲染时间叠加起来
const chunkResults = await mapPool(
  chunks,
  async (chunkFrames) => {
    const ids = chunkFrames.map((f) => f.id).join(",");
    return figmaGet(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=1`, token);
  },
  { concurrency: concurrencyFromEnv() },
);
for (const r of chunkResults) {
  if (r.ok) Object.assign(images, r.value.images || {});
  else console.warn("image batch failed:", r.error?.message || r.error);
}

const outDir = resolve(root, "imports/figma/screens");
mkdirSync(outDir, { recursive: true });

// 并发下载（旧实现逐个 `await fetch(url)`，16 张图的往返被串起来）
const saved = [];
const downloads = await mapPool(
  frames,
  async (frame) => {
    const url = images[frame.id];
    if (!url) {
      console.warn("no image for", frame.name, frame.id);
      return null;
    }
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const safe = frame.name.replace(/[\\/:*?"<>|]/g, "_");
    writeFileSync(resolve(outDir, `${safe}.png`), buf);
    return { name: frame.name, id: frame.id, bytes: buf.length, png: `${safe}.png` };
  },
  { concurrency: concurrencyFromEnv() },
);
for (const r of downloads) if (r.ok && r.value) saved.push(r.value);

console.log(`\ndone: ${saved.length}/${frames.length} frames`);
console.log(JSON.stringify(saved, null, 2));
