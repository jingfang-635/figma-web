#!/usr/bin/env node
/**
 * Extract Visual IR from Figma REST + local screen catalog.
 * Usage (repo root):
 *   node scripts/extract-visual-ir.mjs [FILE_KEY_OR_URL]
 * Writes fixtures/<slug>/visual-ir.json and apps/web/src/generated/visual-ir.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { solidFillHex, walk } from "./lib/env.mjs";
import { initFigma, resolveFileKey, figmaGet } from "./lib/figma.mjs";
import { resolveProject } from "./lib/project.mjs";
import { SCREEN_CATALOG, MODAL_CATALOG, SIDEBAR_GROUPS, classifyTemplate } from "./lib/screen-catalog.mjs";

const root = resolve(process.cwd());
initFigma(root);

function fallbackTokens() {
  return {
    color: {
      primary: "#1677FF",
      primaryHover: "#4096FF",
      primarySoft: "#E6F4FF",
      sidebarBg: "#FFFFFF",
      sidebarText: "#4B5563",
      sidebarActiveBg: "#E6F4FF",
      sidebarActiveText: "#1677FF",
      sidebarBrand: "#1F2937",
      headerBg: "#FFFFFF",
      pageBg: "#F0F2F5",
      surface: "#FFFFFF",
      text: "#1F2937",
      textSecondary: "#6B7280",
      border: "#E5E7EB",
      success: "#52C41A",
      warning: "#FA8C16",
      danger: "#FF4D4F",
      info: "#1677FF",
      tableHead: "#FAFAFA",
    },
    font: {
      family: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      size: { xs: "12px", sm: "13px", md: "14px", lg: "16px", xl: "20px", xxl: "24px" },
    },
    space: { page: 24, gap: 16, header: 56, sidebar: 220 },
    radius: { sm: 4, md: 8, lg: 12 },
    shadow: { card: "0 1px 2px rgba(0,0,0,0.06)", modal: "0 12px 40px rgba(0,0,0,0.18)" },
  };
}

function pickColor(counts, prefer) {
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [hex] of ranked) {
    if (prefer(hex)) return hex;
  }
  return ranked[0]?.[0] ?? null;
}

function isNearWhite(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r > 240 && g > 240 && b > 240;
}

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r + g + b) / 3 < 80;
}

function isVivid(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max - min > 40 && max > 80 && !isNearWhite(hex);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r + g + b) / 3;
}

function analyzeNode(document) {
  const fills = new Map();
  const fonts = new Map();
  const texts = [];
  const fontSizes = [];
  walk(document, (n) => {
    const hex = solidFillHex(n);
    if (hex && hex.length === 7) {
      const area =
        n.absoluteBoundingBox
          ? Math.round(n.absoluteBoundingBox.width * n.absoluteBoundingBox.height)
          : 1;
      fills.set(hex, (fills.get(hex) || 0) + area);
    }
    if (n.type === "TEXT" && n.characters) {
      texts.push(n.characters.trim());
      const family = n.style?.fontFamily;
      if (family) fonts.set(family, (fonts.get(family) || 0) + 1);
      if (n.style?.fontSize) fontSizes.push(n.style.fontSize);
    }
  });
  return { fills, fonts, texts, fontSizes };
}

function tokensFromAnalysis(sidebar, pages) {
  const tokens = fallbackTokens();
  const allFills = new Map();
  for (const src of [sidebar, ...pages]) {
    if (!src) continue;
    for (const [hex, area] of src.fills) {
      allFills.set(hex, (allFills.get(hex) || 0) + area);
    }
  }
  if (sidebar) {
    const sidebarBg = pickColor(sidebar.fills, isDark) || pickColor(sidebar.fills, () => true);
    if (sidebarBg) tokens.color.sidebarBg = sidebarBg;
    const lightText = [...sidebar.fills.keys()].find((h) => luminance(h) > 180);
    if (lightText) tokens.color.sidebarText = lightText;
  }
  const primary = pickColor(allFills, isVivid);
  if (primary) {
    tokens.color.primary = primary;
    tokens.color.sidebarActiveBg = primary;
    tokens.color.info = primary;
  }
  const pageBg = pickColor(allFills, (h) => {
    const l = luminance(h);
    return l > 230 && l < 250;
  });
  if (pageBg) tokens.color.pageBg = pageBg;
  const family = pages
    .concat(sidebar ? [sidebar] : [])
    .flatMap((a) => [...(a?.fonts || [])])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (family) {
    tokens.font.family = `"${family}", "PingFang SC", "Microsoft YaHei", sans-serif`;
  }
  return tokens;
}

function inferSidebarGroups(texts) {
  const labels = new Set(texts.filter((t) => t && t.length < 12));
  const groups = SIDEBAR_GROUPS().map((g) => ({
    id: g.id,
    label: g.label,
    items: g.items.filter((name) => labels.size === 0 || labels.has(name) || SCREEN_CATALOG[name]),
  })).filter((g) => g.items.length);
  return groups.length ? groups : SIDEBAR_GROUPS();
}

const { summary, fileKey } = resolveFileKey(root, process.argv[2]);
if (!summary?.fileKey || !fileKey) {
  console.error("No Figma summary found. Run fetch-overview.mjs first.");
  process.exit(1);
}

const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error(
    "No project slug resolved (no fixtures/<slug>/app-spec.json). Run: node scripts/init-project.mjs --slug <slug> --file <fileKey>",
  );
  process.exit(1);
}

const token = process.env.FIGMA_ACCESS_TOKEN;
const frames = summary.pages?.[0]?.frames || [];

const chromeNames = new Set(
  (spec?.screens || []).filter((s) => s.type === "chrome").map((s) => s.name),
);
const screenFrames = frames.filter(
  (f) =>
    (f.size?.w ?? f.w) >= 1200 &&
    (f.size?.h ?? f.h) >= 900 &&
    !String(f.name).includes("弹窗") &&
    !chromeNames.has(f.name) &&
    f.name !== "激活页面" &&
    f.name !== "sidebar",
);
const modalFrames = frames.filter((f) => String(f.name).includes("弹窗"));
const sidebarFrame =
  frames.find((f) => f.name === "sidebar" && f.type === "COMPONENT") ||
  frames.find((f) => chromeNames.has(f.name));

const notes = [];
let tokens = fallbackTokens();

const layoutDir = resolve(root, "fixtures", slug, "layout-ir");
const layoutTokensPath = resolve(layoutDir, "tokens.json");
if (existsSync(layoutTokensPath)) {
  tokens = JSON.parse(readFileSync(layoutTokensPath, "utf8"));
  notes.push("tokens from Layout IR named nodes");
} else {
  notes.push("Layout IR tokens.json missing; using fallback until visual:layout runs");
}
let sidebarTexts = [];
const sidebarLayoutPath = resolve(layoutDir, "sidebar.json");
if (existsSync(sidebarLayoutPath)) {
  sidebarTexts = JSON.parse(readFileSync(sidebarLayoutPath, "utf8")).texts || [];
}

const chrome = {
  sidebar: {
    nodeId: sidebarFrame?.id || "4:63",
    width: tokens.space?.sidebar || sidebarFrame?.size?.w || 220,
    brandTitle: spec?.brand?.title || summary.name || "",
    brandSubtitle: spec?.brand?.subtitle || "",
    groups: inferSidebarGroups(sidebarTexts),
  },
  header: {
    height: tokens.space?.header || 56,
    slots: ["breadcrumb", "user"],
  },
};

const screens = [];
for (const frame of screenFrames) {
  const catalog = SCREEN_CATALOG()[frame.name];
  const template = catalog?.template || classifyTemplate(frame.name);
  if (!template) continue;
  const regions = catalog?.regions ? { ...catalog.regions } : {};
  regions.title = frame.name;
  screens.push({
    name: frame.name,
    nodeId: frame.id,
    route: catalog?.route || `/${frame.name}`,
    template,
    resource: catalog?.resource,
    needsReview: catalog?.needsReview ?? !catalog,
    regions,
  });
}

const modals = MODAL_CATALOG().map((m) => {
  const hit = modalFrames.find((f) => f.name === m.name);
  const screen = screens.find((s) => s.name === m.screen);
  return {
    ...m,
    nodeId: hit?.id || m.nodeId,
    fields: m.fields || screen?.regions?.formFields || [],
  };
});

const ir = {
  version: "1.0",
  name: summary.name || spec?.name || "",
  figma: {
    fileKey,
    url: `https://www.figma.com/design/${fileKey}`,
    extractedAt: new Date().toISOString(),
  },
  tokens,
  chrome,
  screens,
  modals,
  notes,
};

const outDir = resolve(root, "fixtures", slug);
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "visual-ir.json");
writeFileSync(outPath, JSON.stringify(ir, null, 2), "utf8");

const genDir = resolve(root, "apps/web/src/generated");
mkdirSync(genDir, { recursive: true });
writeFileSync(resolve(genDir, "visual-ir.json"), JSON.stringify(ir, null, 2), "utf8");

console.log("Wrote", outPath);
console.log(`screens=${screens.length} modals=${modals.length} notes=${notes.length}`);
if (notes.length) notes.forEach((n) => console.log("note:", n));
