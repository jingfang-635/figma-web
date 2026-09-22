#!/usr/bin/env node
/**
 * Generate tokens.css + antdTheme.ts from Visual IR (which prefers Layout IR tokens).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject } from "./lib/project.mjs";

const root = resolve(process.cwd());
const { slug } = resolveProject(root);
const irPath = existsSync(resolve(root, "apps/web/src/generated/visual-ir.json"))
  ? resolve(root, "apps/web/src/generated/visual-ir.json")
  : resolve(root, "fixtures", slug, "visual-ir.json");

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const layoutTokensPath = resolve(root, "fixtures", slug, "layout-ir", "tokens.json");
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
for (const [k, v] of Object.entries(space || {})) {
  lines.push(`  --space-${kebab(k)}: ${px(v)};`);
}
for (const [k, v] of Object.entries(radius || {})) {
  lines.push(`  --radius-${k}: ${px(v)};`);
}
for (const [k, v] of Object.entries(shadow || {})) {
  lines.push(`  --shadow-${k}: ${v};`);
}
lines.push("}");
lines.push("");

const outDir = resolve(root, "apps/web/src/styles");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "tokens.css");
writeFileSync(out, lines.join("\n"), "utf8");
console.log("Wrote", out);

const primary = color.primary || "#1677FF";
const themeSrc = `/* Generated from Visual IR / Layout IR. Re-run: node scripts/generate-tokens-css.mjs */
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
      headerBg: '${color.tableHead || "#FAFAFA"}',
    },
    Card: {
      borderRadiusLG: ${Number(radius.md) || 8},
    },
  },
};
`;

const themeDir = resolve(root, "apps/web/src/theme");
mkdirSync(themeDir, { recursive: true });
const themeOut = resolve(themeDir, "antdTheme.ts");
writeFileSync(themeOut, themeSrc, "utf8");
console.log("Wrote", themeOut);
