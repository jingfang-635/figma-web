#!/usr/bin/env node
/**
 * Screen Blueprint 生成器（spec 驱动，跨项目通用）
 *
 * 输入：
 *   fixtures/<slug>/app-spec.json   —— screens/benchmarkScreens（权威来源）
 *   fixtures/<slug>/layout-ir/*.json —— Layout IR 几何（可选，有则注入 layout.regions）
 *
 * 输出：
 *   fixtures/<slug>/screen-blueprints/<screenId>.json
 *   apps/web/src/blueprints/<screenId>.json
 *
 * Blueprint 内容 = App Spec screen 字段（title/subtitle/actions/columns/formFields/stats…）
 * + Layout IR 几何。不再内置任何业务屏；样例数据只用于闸门冻结（visualGate=1）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject } from "./lib/project.mjs";

const root = resolve(process.cwd());
const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error(
    "No project slug resolved. Run: node scripts/init-project.mjs --slug <slug> --file <fileKey>",
  );
  process.exit(1);
}
if (!spec) {
  console.error("app-spec.json missing.");
  process.exit(1);
}

const srcDir = resolve(root, "fixtures", slug, "screen-blueprints");
const layoutDir = resolve(root, "fixtures", slug, "layout-ir");
const webDir = resolve(root, "apps/web/src/blueprints");
mkdirSync(srcDir, { recursive: true });
mkdirSync(webDir, { recursive: true });

function loadLayout(id) {
  const p = resolve(layoutDir, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function regionMap(layout) {
  const map = {};
  for (const r of layout?.regions || []) map[r.id] = r;
  return map;
}

function layoutBlock(layout, extra = {}) {
  if (!layout) return extra;
  return {
    viewport: layout.frame,
    regions: (layout.regions || []).map((r) => ({
      id: r.id,
      nodeId: r.nodeId,
      padding: r.padding,
      gap: r.gap,
      width: r.box?.w,
      height: r.box?.h || r.height,
      font: r.font,
      color: r.color || r.font?.color,
      fill: r.fill,
    })),
    ...extra,
  };
}

/** 从 figma-fields.json 找到某屏的 TEXT 文本（供 sample 数字/文案兜底） */
function textsFor(frameName) {
  const p = resolve(root, "fixtures", "figma-fields.json");
  if (!existsSync(p)) return [];
  try {
    const all = JSON.parse(readFileSync(p, "utf8"));
    const hit = all.find((f) => f.name === frameName);
    return (hit?.texts || []).map((t) => t.text ?? t).filter(Boolean);
  } catch {
    return [];
  }
}

function sampleFromTexts(texts = []) {
  const nums = texts
    .map((t) => String(t).replace(/,/g, ""))
    .filter((t) => /^\d+(\.\d+)?%?$/.test(t) || /^¥/.test(t));
  return nums.slice(0, 12);
}

/** screen 定义（app-spec.screens）→ Blueprint */
function blueprintFor(screen) {
  const layout = loadLayout(screen.blueprint || screen.id);
  const texts = textsFor(screen.name);
  const bp = {
    id: screen.id || screen.name,
    route: screen.route,
    refShot: `imports/figma/screens/${screen.name}.png`,
    pageHeader: {
      title: screen.name,
      subtitle: screen.subtitle || "",
    },
    ...layoutBlock(layout),
  };
  // regions 已由 App Spec 承载（columns/formFields/actions/stats/modals…）原样透传
  const regionKeys = [
    "stats",
    "actions",
    "filters",
    "columns",
    "table",
    "formFields",
    "modalFields",
    "sections",
    "formCard",
    "cardTitle",
    "statusMap",
    "charts",
    "pagination",
    "searchPlaceholder",
  ];
  for (const k of regionKeys) {
    if (screen[k] !== undefined) bp[k] = screen[k];
  }
  if (screen.modals?.length) bp.modals = screen.modals;
  // sample：从 Figma 真实文本提取的数字/文案（闸门冻结用）
  bp.sample = { figmaTexts: sampleFromTexts(texts) };
  return bp;
}

// benchmarkScreens 优先（闸门屏）；screens 全量（含非标杆）
const bms = spec.benchmarkScreens || [];
const screens = spec.screens || [];
const byName = new Map(screens.map((s) => [s.name, s]));
const ids = new Set();
const out = [];

for (const b of bms) {
  if (b.type === "chrome") continue;
  const screen = byName.get(b.name) || {};
  const bp = blueprintFor({ id: b.id, name: b.name, route: b.route, subtitle: screen.subtitle, ...screen });
  ids.add(bp.id);
  out.push(bp);
}
for (const s of screens) {
  const id = s.id || s.name;
  if (ids.has(id)) continue;
  out.push(blueprintFor(s));
  ids.add(id);
}

if (!out.length) {
  console.error("No screens/benchmarkScreens in app-spec.json — nothing to generate.");
  process.exit(1);
}

for (const bp of out) {
  const json = JSON.stringify(bp, null, 2) + "\n";
  writeFileSync(resolve(srcDir, `${bp.id}.json`), json, "utf8");
  writeFileSync(resolve(webDir, `${bp.id}.json`), json, "utf8");
  console.log("Wrote", `${bp.id}.json`);
}
console.log(`\n${out.length} blueprints -> fixtures/${slug}/screen-blueprints/ + apps/web/src/blueprints/`);