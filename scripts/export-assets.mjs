#!/usr/bin/env node
/**
 * Export nav/department/brand assets from Layout IR node ids via Figma Images API.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, resolveFileKey, figmaGet } from "./lib/figma.mjs";

const root = resolve(process.cwd());
initFigma(root);

const { summary, fileKey } = resolveFileKey(root, process.argv[2]);
const token = process.env.FIGMA_ACCESS_TOKEN;
const layoutDir = resolve(root, "fixtures/sunshine-medical/layout-ir");
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

for (const item of exportables) {
  const url = images[item.nodeId];
  if (!url) {
    console.warn("no image for", item.kind, item.label, item.nodeId);
    continue;
  }
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  let dest;
  const file = `${slugLabel(item.label || item.name || item.nodeId)}.png`;
  if (item.kind === "nav") {
    dest = resolve(outDir, "nav", file);
    manifest.nav[item.label] = `/assets/nav/${file}`;
  } else if (item.kind === "dept") {
    dest = resolve(outDir, "depts", file);
    manifest.depts[item.label] = `/assets/depts/${file}`;
  } else if (item.kind === "brand") {
    dest = resolve(outDir, "brand", file);
    if (!manifest.brand) manifest.brand = `/assets/brand/${file}`;
  } else {
    dest = resolve(outDir, file);
  }
  writeFileSync(dest, buf);
  manifest.exported += 1;
  console.log("saved", dest, buf.length);
}

writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
const genDir = resolve(root, "apps/web/src/generated");
mkdirSync(genDir, { recursive: true });
writeFileSync(resolve(genDir, "assetManifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote manifest, exported", manifest.exported);
