#!/usr/bin/env node
/**
 * Export nav/department/brand assets from Layout IR node ids via Figma Images API.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, resolveFileKey, figmaGet } from "./lib/figma.mjs";
import { resolveProject } from "./lib/project.mjs";
import { mapPool, concurrencyFromEnv } from "./lib/concurrency.mjs";

const root = resolve(process.cwd());
const { slug } = resolveProject(root);
initFigma(root);

const { summary, fileKey } = resolveFileKey(root, process.argv[2]);
const token = process.env.FIGMA_ACCESS_TOKEN;
const layoutDir = resolve(root, "fixtures", slug, "layout-ir");
const outDir = resolve(root, "apps/web/public/assets");
mkdirSync(resolve(outDir, "nav"), { recursive: true });
mkdirSync(resolve(outDir, "depts"), { recursive: true });
mkdirSync(resolve(outDir, "brand"), { recursive: true });

function loadLayoutFiles() {
  if (!existsSync(layoutDir)) return [];
  return readdirSync(layoutDir)
    .filter((f) => f.endsWith(".json") && f !== "index.json" && f !== "tokens.json")
    .map((f) => JSON.parse(readFileSync(resolve(layoutDir, f), "utf8")));
}

function slugLabel(label) {
  return String(label).replace(/[\\/:*?"<>|\s]+/g, "_");
}

const layouts = loadLayoutFiles();
const exportables = [];
const seen = new Set();
for (const ir of layouts) {
  for (const item of ir.exportables || []) {
    if (!item.nodeId || seen.has(item.nodeId)) continue;
    seen.add(item.nodeId);
    exportables.push(item);
  }
}

const manifest = {
  fileKey: fileKey || summary?.fileKey || null,
  publicPath: "/assets",
  nav: {},
  depts: {},
  brand: null,
  exported: 0,
};

if (!token || !manifest.fileKey || !exportables.length) {
  const payload = { ...manifest, note: "No Layout IR exportables; UI will use fallbacks." };
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(payload, null, 2), "utf8");
  const genDir = resolve(root, "apps/web/src/generated");
  mkdirSync(genDir, { recursive: true });
  writeFileSync(resolve(genDir, "assetManifest.json"), JSON.stringify(payload, null, 2), "utf8");
  console.log("Skip Figma image export (missing token, fileKey, or Layout IR). Wrote manifest.");
  process.exit(0);
}

const ids = exportables.map((e) => e.nodeId).join(",");
const data = await figmaGet(
  `/images/${manifest.fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
  token,
);
const images = data.images || {};

// 并发下载（通用并发度取自 .env）。旧实现逐个 `await fetch(url)`，
// 68 个资产的往返被完全串起来 → 下载占掉大半时间。
//
// 注意：worker 只下载并返回「落哪个文件」，**不直接改 manifest**——
// 并发完成顺序不确定，若在 worker 里写 manifest，键序会随调度漂移，
// 生成物每次 diff 都变（值相同也噪声极大）。manifest 在收集后按 exportables 原序组装。
const downloads = await mapPool(
  exportables,
  async (item) => {
    const url = images[item.nodeId];
    if (!url) {
      console.warn("no image for", item.kind, item.label, item.nodeId);
      return null;
    }
    const img = await fetch(url);
    const buf = Buffer.from(await img.arrayBuffer());
    const file = `${slugLabel(item.label || item.name || item.nodeId)}.png`;
    const dir = item.kind === "nav" || item.kind === "dept" || item.kind === "brand" ? item.kind : "";
    const rel = dir ? `${dir}/${file}` : file;
    writeFileSync(resolve(outDir, rel), buf);
    return { kind: item.kind, label: item.label, rel, bytes: buf.length };
  },
  { concurrency: concurrencyFromEnv() },
);

let saved = 0;
for (let i = 0; i < downloads.length; i++) {
  const r = downloads[i];
  if (!r.ok) {
    console.warn("download failed:", exportables[i].label || exportables[i].nodeId, r.error?.message || r.error);
    continue;
  }
  if (!r.value) continue;
  const { kind, label, rel } = r.value;
  if (kind === "nav") manifest.nav[label] = `/assets/${rel}`;
  else if (kind === "dept") manifest.depts[label] = `/assets/${rel}`;
  else if (kind === "brand") {
    if (!manifest.brand) manifest.brand = `/assets/${rel}`;
  }
  manifest.exported += 1;
  saved += 1;
}
console.log("downloaded", saved, "assets");

writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
const genDir = resolve(root, "apps/web/src/generated");
mkdirSync(genDir, { recursive: true });
writeFileSync(resolve(genDir, "assetManifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote manifest, exported", manifest.exported);
