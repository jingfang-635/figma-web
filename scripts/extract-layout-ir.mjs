#!/usr/bin/env node
/**
 * Extract Layout IR (geometry) for benchmark Figma frames.
 * Usage (repo root):
 *   node scripts/extract-layout-ir.mjs [FILE_KEY_OR_URL]
 * Writes fixtures/<slug>/layout-ir/*.json
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, resolveFileKey, figmaGet, BENCHMARK_FRAMES, pickFrame } from "./lib/figma.mjs";
import {
  simplifyNode,
  associateIcons,
  tokensFromNamedNodes,
  inferRegions,
  collectExportables,
  collectTexts,
} from "./lib/layout-ir.mjs";

const root = resolve(process.cwd());
initFigma(root);

const { summary, fileKey } = resolveFileKey(root, process.argv[2]);
if (!fileKey) {
  console.error("No Figma summary found. Run fetch-overview.mjs first.");
  process.exit(1);
}

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error("FIGMA_ACCESS_TOKEN missing in .env");
  process.exit(1);
}

const frames = summary?.pages?.[0]?.frames || [];
const targets = BENCHMARK_FRAMES.map((spec) => {
  const frame = pickFrame(frames, spec);
  return frame ? { ...spec, frame } : { ...spec, frame: null };
});

const missing = targets.filter((t) => !t.frame);
if (missing.length) {
  console.warn(
    "Missing frames:",
    missing.map((m) => m.id).join(", "),
  );
}

const ready = targets.filter((t) => t.frame);
if (!ready.length) {
  console.error("No benchmark frames to extract");
  process.exit(1);
}

const slug = "sunshine-medical";
const outDir = resolve(root, "fixtures", slug, "layout-ir");
mkdirSync(outDir, { recursive: true });

const nodes = {};
try {
  for (const t of ready) {
    const data = await figmaGet(
      `/files/${fileKey}/nodes?ids=${encodeURIComponent(t.frame.id)}`,
      token,
    );
    Object.assign(nodes, data.nodes || {});
    await new Promise((r) => setTimeout(r, 800));
  }
} catch (err) {
  console.warn("Figma extract failed:", err.message);
  if (existsSync(resolve(outDir, "index.json"))) {
    console.warn("Keeping existing Layout IR seed. Re-run visual:layout later.");
    process.exit(0);
  }
  throw err;
}

const extractedAt = new Date().toISOString();
const files = [];
const simplified = {};

for (const t of targets) {
  if (!t.frame) continue;
  const doc = nodes[t.frame.id]?.document;
  if (!doc) {
    console.warn("No document for", t.id, t.frame.id);
    continue;
  }
  const tree = simplifyNode(doc);
  simplified[t.id] = tree;
  const icons = associateIcons(tree);
  const regions = inferRegions(t.id, tree);
  const exportables = collectExportables(t.id, tree, icons);
  const ir = {
    id: t.id,
    name: t.frame.name,
    nodeId: t.frame.id,
    frame: tree.box || { w: t.frame.size?.w, h: t.frame.size?.h },
    extractedAt,
    fileKey,
    regions,
    exportables,
    icons,
    texts: collectTexts(tree),
    tree,
  };
  const dest = resolve(outDir, `${t.id}.json`);
  writeFileSync(dest, JSON.stringify(ir, null, 2), "utf8");
  files.push({
    id: t.id,
    path: `fixtures/${slug}/layout-ir/${t.id}.json`,
    nodeId: t.frame.id,
    name: t.frame.name,
  });
  console.log("Wrote", dest, `regions=${regions.length} exportables=${exportables.length}`);
}

const pages = ["home", "organization", "departments", "schedules", "modal-create-dept"]
  .map((id) => simplified[id])
  .filter(Boolean);
const tokens = tokensFromNamedNodes(simplified.sidebar, pages);
writeFileSync(resolve(outDir, "tokens.json"), JSON.stringify(tokens, null, 2), "utf8");

const index = {
  version: "1.0",
  slug,
  fileKey,
  extractedAt,
  frames: files,
  tokenPath: `fixtures/${slug}/layout-ir/tokens.json`,
};
writeFileSync(resolve(outDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
console.log("Wrote", resolve(outDir, "index.json"));
console.log("Wrote", resolve(outDir, "tokens.json"));
