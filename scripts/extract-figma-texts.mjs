#!/usr/bin/env node
/**
 * Extract TEXT nodes from main screens + modals for field-level alignment.
 * Usage: node scripts/extract-figma-texts.mjs [FILE_KEY_OR_URL]
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

const SKIP = /^(icon|svg-icon|激活页面)$/;
const frames = (summary?.pages?.[0]?.frames || []).filter((f) => {
  if (SKIP.test(f.name)) return false;
  if (f.name === "sidebar" && f.type !== "COMPONENT") return false;
  if (f.size?.w >= 400) return true;
  return f.name === "sidebar";
});

function collectTexts(node, depth = 0, acc = []) {
  if (!node || node.visible === false) return acc;
  if (node.type === "TEXT" && node.characters) {
    acc.push({
      text: node.characters,
      depth,
      fontSize: node.style?.fontSize ?? null,
    });
  }
  for (const child of node.children || []) collectTexts(child, depth + 1, acc);
  return acc;
}

const CHUNK = 4;
const nodes = {};
for (let i = 0; i < frames.length; i += CHUNK) {
  const chunk = frames.slice(i, i + CHUNK);
  const ids = chunk.map((f) => f.id).join(",");
  const data = await figmaGet(
    `/files/${fileKey}/nodes?ids=${encodeURIContent(ids)}&depth=12`,
    token,
  );
  Object.assign(nodes, data.nodes || {});
  console.log(`fetched ${Math.min(i + CHUNK, frames.length)}/${frames.length}`);
}

function encodeURIContent(ids) {
  return encodeURIComponent(ids);
}

const out = frames.map((frame) => {
  const doc = nodes[frame.id]?.document;
  const texts = collectTexts(doc);
  console.log(`${frame.name}: ${texts.length} texts`);
  return {
    name: frame.name,
    id: frame.id,
    size: frame.size,
    texts,
  };
});

mkdirSync(resolve(root, "fixtures"), { recursive: true });
const dest = resolve(root, "fixtures", "figma-fields.json");
writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", dest, "screens=", out.length);
