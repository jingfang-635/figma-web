#!/usr/bin/env node
/**
 * Usage (from any repo root):
 *   node ~/.cursor/skills/figma-to-fullstack/scripts/fetch-overview.mjs <FIGMA_FILE_KEY_OR_URL>
 * Reads FIGMA_ACCESS_TOKEN from cwd .env
 * Writes imports/figma/<key>-summary.json under cwd
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseFileKey(input) {
  const trimmed = String(input || "").trim();
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (m?.[1]) return m[1];
  throw new Error("Invalid Figma URL or fileKey");
}

const root = resolve(process.cwd());
loadEnv(resolve(root, ".env"));

const fileKey = parseFileKey(process.argv[2]);
const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error("FIGMA_ACCESS_TOKEN missing in .env");
  process.exit(1);
}

const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=3`, {
  headers: { "X-Figma-Token": token },
});
const data = await res.json();
console.log("status", res.status);
if (!res.ok) {
  console.error(JSON.stringify(data).slice(0, 800));
  process.exit(1);
}

console.log("name:", data.name);

const summary = { name: data.name, lastModified: data.lastModified, fileKey, pages: [] };
for (const page of data.document?.children || []) {
  const pageInfo = { id: page.id, name: page.name, frames: [] };
  const walk = (nodes, depth = 0) => {
    for (const n of nodes || []) {
      if (["FRAME", "COMPONENT", "INSTANCE", "SECTION"].includes(n.type)) {
        pageInfo.frames.push({
          id: n.id,
          type: n.type,
          name: n.name,
          size: n.absoluteBoundingBox
            ? {
                w: Math.round(n.absoluteBoundingBox.width),
                h: Math.round(n.absoluteBoundingBox.height),
              }
            : null,
          depth,
        });
      }
      if (n.children && depth < 2) walk(n.children, depth + 1);
    }
  };
  walk(page.children || []);
  summary.pages.push(pageInfo);
  console.log(`\nPAGE: ${page.name} (${pageInfo.frames.length} frames)`);
  for (const f of pageInfo.frames.slice(0, 40)) {
    const size = f.size ? `${f.size.w}x${f.size.h}` : "";
    console.log(`  [${f.type}] ${f.name} ${size}`);
  }
}

mkdirSync(resolve(root, "imports/figma"), { recursive: true });
const out = resolve(root, "imports/figma", `${fileKey}-summary.json`);
writeFileSync(out, JSON.stringify(summary, null, 2), "utf8");
console.log("\nSaved", out);
