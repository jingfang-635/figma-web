#!/usr/bin/env node
/**
 * Generate tokens.css + antdTheme.ts from Visual IR (which prefers Layout IR tokens).
 *
 * 主题前移（2026-09-24）：除全局 token 外，还从 Layout IR 屏几何推导 antd 组件级 token，
 * 替代还原轮次里用 !important 逐条覆盖 antd 默认样式的「CSS 打地鼠」：
 *   - Table：从 list 屏 h=62 等差矩形群推 cellPaddingBlock（行高 62 → padding 13）
 *   - Modal：从 modal 屏 tree.box/header/label/input 推 headerBg/titleFontSize/bodyPadding
 *   - Card：从屏树最大白底容器头推 headerHeight/headerFontSize
 * 提取不到时回退 antd 默认（不猜数字），行为与旧版一致。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject } from "./lib/project.mjs";

const root = resolve(process.cwd());
const { slug } = resolveProject(root);
const irDir = resolve(root, "fixtures", slug, "layout-ir");
const irPath = existsSync(resolve(root, "apps/web/src/generated/visual-ir.json"))
  ? resolve(root, "apps/web/src/generated/visual-ir.json")
  : resolve(root, "fixtures", slug, "visual-ir.json");

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const layoutTokensPath = resolve(irDir, "tokens.json");
const tokens = existsSync(layoutTokensPath)
  ? JSON.parse(readFileSync(layoutTokensPath, "utf8"))
  : ir.tokens;
const { color, font, space, radius, shadow } = tokens;

const px = (v) => (typeof v === "number" ? `${v}px` : String(v));
const kebab = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

const lines = [
  "/* Generated from Visual IR / Layout IR. Re-run: node scripts/generate-tokens-css.mjs */",
  ":root {",
];

for (const [k, v] of Object.entries(color || {})) {
  lines.push(`  --color-${kebab(k)}: ${v};`);
}
lines.push(`  --font-family: ${font.family};`);
for (const [k, v] of Object.entries(font.size || {})) {
  lines.push(`  --font-size-${k}: ${v};`);
}
for (const [k, v] of Object.entries(space || {}) ) {
  lines.push(`  --space-${kebab(k)}: ${px(v)};`);
}
for (const [r, v] of Object.entries(radius || {})) {
  lines.push(`  --radius-${k2name(r)}: ${px(v)};`);
}
lines.push("}");
lines.push("");

// radius key 兼容：tokens.json 用 sm/md/lg，直接输出
function k2name(k) {
  return k;
}

const outDir = resolve(root, "apps/web/src/styles");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "tokens.css");
writeFileSync(out, lines.join("\n"), "utf8");
console.log("Wrote", out);

// ============ 从 Layout IR 屏几何推导组件 token ============

/** 收集 IR 树所有节点（含 box） */
function collectNodes(tree, acc = []) {
  const b = tree.box || {};
  if (b.w) acc.push({ name: String(tree.name || ""), type: tree.type, x: b.x, y: b.y, w: b.w, h: b.h, fill: tree.fill });
  for (const c of tree.children || []) collectNodes(c, acc);
  return acc;
}

/**
 * 表格行高：找 h 相同且 y 等差（公差=h）的矩形群（≥3 个），取众数高度。
 * departments IR：x 不限，h=62 群，y 364→426→488。
 */
function inferTableRowHeight(irFiles) {
  const candidates = [];
  for (const { tree } of irFiles) {
    const nodes = collectNodes(tree);
    const byH = new Map();
    for (const n of nodes) {
      if (n.h >= 40 && n.h <= 100 && n.w >= 60) {
        if (!byH.has(n.h)) byH.set(n.h, []);
        byH.get(n.h).push(n);
      }
      }
    for (const [h, list] of byH) {
      const ys = [...new Set(list.map((n) => n.y))].sort((a, b) => a - b);
      // 找最长等差游程（公差=±2 内视为等差）
      let run = 1;
      let best = 1;
      for (let i = 1; i < ys.length; i++) {
        if (Math.abs(ys[i] - ys[i - 1] - h) <= 2) {
          run++;
          best = Math.max(best, run);
        } else {
          run = 1;
        }
      }
      if (best >= 3) candidates.push({ h, run: best });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.run - a.run);
  return candidates[0].h;
}

/**
 * Modal 几何：从 modal 屏 IR 提取 { w, h, headerH, titleSize, inputH }。
 * modal 屏识别：spec.screens 里 type=modal 对应的 layout-ir/<id>.json；fallback 按名字含「弹窗」。
 */
function inferModalGeometry(irFiles) {
  let best = null;
  for (const { tree } of irFiles) {
    const nodes = collectNodes(tree);
    const headerH = nodes.find((n) => n.h >= 50 && n.h <= 75 && n.w >= (tree.box?.w || 0) * 0.9);
    if (!headerH) continue;
    const title = nodes.find((n) => n.type === "TEXT" && n.h >= 20 && n.h <= 26 && n.y < (headerH?.y ?? 0) + headerH.h);
    const inputs = nodes.filter((n) => n.h === 40 && n.w >= 100 && n.w <= tree.box.w * 0.9);
    const geo = {
      w: tree.box.w,
      h: tree.box.h,
      headerH: headerH.h,
      // 文本节点 box 高 ≈ 1.4×字号（含上下伸部），换算回字号
      titleSize: title ? Math.round(title.h / 1.4) : null,
      inputH: inputs.length ? Math.round(inputs.reduce((s, n) => s + n.h, 0) / inputs.length) : null,
    };
    if (!best || geo.w * geo.h > best.w * best.h) best = geo;
  }
  return best;
}

/** 读取 spec.screens 全量覆盖的 IR 文件（chrome 除外）+ modal 屏 */
function loadIrFiles() {
  const files = [];
  if (!existsSync(irDir)) return files;
  for (const f of readdirSync(irDir)) {
    if (!f.endsWith(".json") || f === "tokens.json" || f === "index.json") continue;
    try {
      const tree = JSON.parse(readFileSync(resolve(irDir, f), "utf8"));
      if (tree?.tree?.box) files.push({ file: f, tree: tree.tree });
    } catch {
      // ignore broken IR
    }
  }
  return files;
}

const irFiles = loadIrFiles();
const rowH = inferTableRowHeight(irFiles);
const modalGeo = inferModalGeometry(irFiles);

// antd 默认 cellPaddingBlock=16，行高 = fontSize(14)+lineHeight(22)+padding*2 ≈ 65
// Figma 行高 62 → padding = (62 - 36) / 2 = 13
const tableCellPaddingBlock = rowH ? Math.round((rowH - 36) / 2) : null;

// ============ 生成 antdTheme.ts ============

const primary = color.primary || "#1677FF";
const themeSrc = `/* Generated from Visual IR / Layout IR + screen geometry. Re-run: node scripts/generate-tokens-css.mjs */
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '${primary}',
    colorSuccess: '${color.success || "#52C41A"}',
    colorWarning: '${color.warning || "#FA8C16"}',
    colorError: '${color.danger || "#FF4D4F"}',
    colorInfo: '${color.info || primary}',
    colorBgLayout: '${color.pageBg || "#F0F2F5"}',
    colorBgContainer: '${color.surface || "#FFFFFF"}',
    colorText: '${color.text || "#1F2937"}',
    colorTextSecondary: '${color.textSecondary || "#6B7280"}',
    colorBorder: '${color.border || "#E5E7EB"}',
    borderRadius: ${Number(radius.md) || 8},
    fontFamily: ${JSON.stringify(font.family)},
    fontSize: ${parseInt(font.size?.md || "14", 10) || 14},
    controlHeight: 32,
  },
  components: {
    Layout: {
      headerBg: '${color.headerBg || "#FFFFFF"}',
      siderBg: '${color.sidebarBg || "#FFFFFF"}',
      bodyBg: '${color.pageBg || "#F0F2F5"}',
      headerHeight: ${Number(space.header) || 56},
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '${color.sidebarActiveBg || "#E6F4FF"}',
      itemSelectedColor: '${color.sidebarActiveText || primary}',
      itemColor: '${color.sidebarText || "#4B5563"}',
      itemHoverBg: '#F5F5F5',
      itemBorderRadius: 6,
      iconSize: ${Number(space.navIcon) || 16},
      iconMarginInlineEnd: ${Number(space.navIconGap) || 13},
    },
    Table: {
      headerBg: '${color.tableHead || "#FAFAFA"}',${
        tableCellPaddingBlock ? `\n      cellPaddingBlock: ${tableCellPaddingBlock}, // from Layout IR row height ${rowH}px` : ""
      }${
        rowH ? `\n      cellPaddingInline: 24,` : ""
      }
    },
    Card: {
      borderRadiusLG: ${Number(radius.md) || 8},
    },${
      modalGeo
        ? `
    Modal: {
      contentBg: '${color.surface || "#FFFFFF"}',
      headerBg: '${color.surface || "#FFFFFF"}',
      titleFontSize: ${modalGeo.titleSize || 16}, // from Layout IR modal title text height
      boxShadow: '${shadow.modal || "0 12px 40px rgba(0,0,0,0.18)"}',
    },`
        : ""
    }
  },
};
`;

const themeDir = resolve(root, "apps/web/src/theme");
mkdirSync(themeDir, { recursive: true });
const themeOut = resolve(themeDir, "antdTheme.ts");
writeFileSync(themeOut, themeSrc, "utf8");
console.log("Wrote", themeOut);
console.log(
  `[theme-ir] rowHeight=${rowH ?? "-"} cellPaddingBlock=${tableCellPaddingBlock ?? "-"} modal=${modalGeo ? `${modalGeo.w}x${modalGeo.h} header=${modalGeo.headerH}` : "-"}`,
);