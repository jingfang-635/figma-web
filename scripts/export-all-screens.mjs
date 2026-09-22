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
for (let i = 0; i < frames.length; i += CHUNK) {
  const chunk = frames.slice(i, i + CHUNK);
  const ids = chunk.map((f) => f.id).join(",");
  const data = await figmaGet(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=1`, token);
  Object.assign(images, data.images || {});
}

const outDir = resolve(root, "imports/figma/screens");
mkdirSync(outDir, { recursive: true });

const saved = [];
for (const frame of frames) {
  const url = images[frame.id];
  if (!url) {
    console.warn("no image for", frame.name, frame.id);
    continue;
  }
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const safe = frame.name.replace(/[\\/:*?"<>|]/g, "_");
  const dest = resolve(outDir, `${safe}.png`);
  writeFileSync(dest, buf);
  saved.push({ name: frame.name, id: frame.id, bytes: buf.length, png: `${safe}.png` });
  console.log("saved", dest, buf.length, "bytes");
}

console.log(`\ndone: ${saved.length}/${frames.length} frames`);
console.log(JSON.stringify(saved, null, 2));
