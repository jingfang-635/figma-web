import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject } from "./project.mjs";

/**
 * 项目 catalog 加载顺序：
 *   1. fixtures/<slug>/screen-catalog.json（项目自带，权威）
 *   2. 无 → 空 catalog（字段由 figma-fields 回填流程提供，needsReview=true）
 *
 * 阳光医疗的内置 catalog 已导出到 fixtures/sunshine-medical/screen-catalog.json，
 * 不再作为所有项目的默认值（跨项目硬编码清除）。
 */

const root = resolve(process.cwd());

let cached = null;
function loadCatalog() {
  if (cached) return cached;
  const { slug } = resolveProject(root);
  const p = slug ? resolve(root, "fixtures", slug, "screen-catalog.json") : null;
  if (p && existsSync(p)) {
    cached = JSON.parse(readFileSync(p, "utf8"));
    return cached;
  }
  cached = { SCREEN_CATALOG: {}, MODAL_CATALOG: [], SIDEBAR_GROUPS: [] };
  return cached;
}

// 兼容命名导入：消费方 `import { SCREEN_CATALOG, ... } from screen-catalog.mjs`
export const _catalogRef = { get current() { return loadCatalog(); } };

export function SCREEN_CATALOG() {
  return loadCatalog().SCREEN_CATALOG || {};
}
export function MODAL_CATALOG() {
  return loadCatalog().MODAL_CATALOG || [];
}
export function SIDEBAR_GROUPS() {
  return loadCatalog().SIDEBAR_GROUPS || [];
}

export function classifyTemplate(name) {
  if (/首页|工作台|看板|dashboard/i.test(name)) return "dashboard";
  if (/排班|日历|calendar/i.test(name)) return "schedule";
  if (/规则|设置|信息|profile|settings/i.test(name)) return "form";
  if (/弹窗/.test(name)) return null;
  return "list";
}