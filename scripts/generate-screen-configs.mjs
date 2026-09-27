#!/usr/bin/env node
/** Generate apps/web/src/generated/screenConfigs.ts from Visual IR. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject } from "./lib/project.mjs";

const root = resolve(process.cwd());
const { slug, spec } = resolveProject(root);
const irPath = existsSync(resolve(root, "apps/web/src/generated/visual-ir.json"))
  ? resolve(root, "apps/web/src/generated/visual-ir.json")
  : resolve(root, "fixtures", slug, "visual-ir.json");

const ir = JSON.parse(readFileSync(irPath, "utf8"));

const header = `/* Generated from Visual IR + app-spec.json (brand / screens[].sample). Re-run: node scripts/generate-screen-configs.mjs */
export type TemplateKind = 'dashboard' | 'list' | 'form' | 'schedule' | 'content';
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'password' | 'boolean';
export type ColumnKind = 'text' | 'status' | 'datetime' | 'relation' | 'boolean' | 'title-desc';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  kind?: ColumnKind;
  relationLabel?: string;
  descKey?: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  relatedResource?: string;
  relatedLabelKey?: string;
  hint?: string;
}

export interface FilterConfig {
  key: string;
  type: 'search' | 'select';
  placeholder?: string;
  label?: string;
  options?: SelectOption[];
  optionsFrom?: string; // 关联资源的下拉数据源（如 departments/doctors），页面层解析
}

export interface ScreenAction {
  label: string;
  variant?: 'primary' | 'secondary';
  modal?: string;
}

export interface ScreenSection {
  title: string;
  resource: string;
  columns: ColumnConfig[];
  rowActions: string[];
  pagination: boolean;
  statusMap?: Record<string, { label: string; color?: string }>;
}

export interface ScreenConfig {
  name: string;
  nodeId?: string;
  route: string;
  template: TemplateKind;
  resource?: string;
  needsReview?: boolean;
  title: string;
  subtitle?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  formCard?: { title?: string; subtitle?: string; primaryAction?: string };
  filters: FilterConfig[];
  actions: ScreenAction[];
  columns: ColumnConfig[];
  formFields: FormFieldConfig[];
  rowActions: string[];
  pagination: boolean;
  readOnly?: boolean;
  stats?: Array<{ key: string; label: string }>;
  statusMap?: Record<string, { label: string; color?: string }>;
  sections?: ScreenSection[];
  /**
   * 闸门冻结样本：**spec 声明**（app-spec.json → screens[].sample），由生成器原样下发。
   * gate 模式下页面用它替代接口数据，保证与原型标杆逐字一致；页面不得自带副本。
   */
  sample?: Record<string, unknown>;
}

`;

/** 闸门冻结样本按屏名取自 spec（app-spec.json → screens[].sample），生成物原样下发 */
const sampleByName = new Map(
  (spec?.screens || []).filter((s) => s.sample).map((s) => [s.name, s.sample]),
);

const screens = ir.screens.map((s) => {
  const r = s.regions || {};
  return {
    name: s.name,
    nodeId: s.nodeId,
    route: s.route,
    template: s.template,
    resource: s.resource,
    needsReview: s.needsReview || false,
    sample: sampleByName.get(s.name),
    title: r.title || s.name,
    subtitle: r.subtitle,
    cardTitle: r.cardTitle,
    cardSubtitle: r.cardSubtitle,
    formCard: r.formCard,
    filters: r.filters || [],
    actions: r.actions || [],
    columns: r.table?.columns || [],
    formFields: r.formFields || [],
    rowActions: r.table?.rowActions || [],
    pagination: Boolean(r.pagination),
    readOnly: Boolean(r.readOnly),
    stats: r.stats,
    statusMap: r.statusMap,
    sections: (r.sections || []).map((sec) => ({
      title: sec.title,
      resource: sec.resource,
      columns: sec.table?.columns || [],
      rowActions: sec.table?.rowActions || [],
      pagination: Boolean(sec.pagination),
      statusMap: sec.statusMap,
    })),
  };
});

/**
 * 侧栏条目：标签/顺序/徽标取自 chrome.sidebar（Layout IR），路由按屏名回查 ir.screens。
 * 组件不做「标签→路由」推导（推导属 codegen）；未画出路由的项保留外观但不可跳转。
 * 键一律存在（缺省为 null），避免生成物出现联合类型导致消费方取属性报错。
 */
const routeByName = new Map((ir.screens || []).map((s) => [s.name, s.route]));
const sidebar = ir.chrome?.sidebar || {};
const sidebarBadges = sidebar.badges || {};
const sidebarItems = (sidebar.groups || [])
  .flatMap((g) => g.items || [])
  .map((label) => ({
    label,
    // 图标资产按 IR 条目标签命名（export-assets 约定），与标签同源
    icon: label,
    route: routeByName.get(label) ?? null,
    badge: sidebarBadges[label] ?? null,
  }));

const body =
  header +
  `export const brand = ${JSON.stringify(spec?.brand || {}, null, 2)};\n\n` +
  `export const screenConfigs: ScreenConfig[] = ${JSON.stringify(screens, null, 2)};\n\n` +
  `export const sidebarItems: Array<{ label: string; icon: string; route: string | null; badge: string | null }> = ${JSON.stringify(sidebarItems, null, 2)};\n\n` +
  `export const sidebarChrome = ${JSON.stringify(ir.chrome.sidebar, null, 2)};\n\n` +
  `export const modalConfigs = ${JSON.stringify(ir.modals, null, 2)};\n\n` +
  `export function getScreenByRoute(route: string): ScreenConfig | undefined {\n` +
  `  return screenConfigs.find((s) => s.route === route);\n` +
  `}\n`;

const outDir = resolve(root, "apps/web/src/generated");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "screenConfigs.ts");
writeFileSync(out, body, "utf8");
console.log("Wrote", out);
