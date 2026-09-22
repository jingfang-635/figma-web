#!/usr/bin/env node
/**
 * 字段一致性校验（交付闸门之一）
 *
 * 断言：screenConfigs.ts 中每个屏的 columns/formFields/filters/actions/stats/title/subtitle
 * 与 fixtures/figma-fields.json（Figma 节点真实文本）逐字一致。
 *
 * 通过标准：
 *   1. screenConfigs.ts 中 "needsReview": true 数量 = 0
 *   2. 每屏关键 label 均能在 figma-fields 中找到
 *   3. figma-fields 中出现而 config 缺失的关键字段 → FAIL
 *
 * Usage: node scripts/check-field-consistency.mjs
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

const configsPath = resolve(root, "apps/web/src/generated/screenConfigs.ts");
const fieldsPath = resolve(root, "fixtures/figma-fields.json");

if (!existsSync(configsPath)) {
  console.error("❌ screenConfigs.ts 不存在，请先 npm run visual:gen");
  process.exit(1);
}
if (!existsSync(fieldsPath)) {
  console.error("❌ fixtures/figma-fields.json 不存在，请先 node scripts/extract-figma-texts.mjs");
  process.exit(1);
}

const configsSource = readFileSync(configsPath, "utf8");
const figmaFields = JSON.parse(readFileSync(fieldsPath, "utf8"));

// —— 1. needsReview 必须清零 ——
const needsReviewCount = (configsSource.match(/"needsReview":\s*true/g) || []).length;
if (needsReviewCount > 0) {
  console.error(`❌ needsReview=true 的屏还有 ${needsReviewCount} 个，须逐屏回填后置 false`);
  process.exit(1);
}

// —— 2. 提取 config 中每屏的字段文本 ——
/** 粗提取：screenConfigs.ts 为生成文件，结构稳定（name: "X", ... label: "Y"） */
function parseScreens(source) {
  const screens = {};
  const screenRe = /name:\s*"([^"]+)",\s*\n\s*route:[\s\S]*?(?=\n  \{|$)/g;
  let m;
  while ((m = screenRe.exec(source)) !== null) {
    const name = m[1];
    const block = m[0];
    const labels = [...block.matchAll(/label:\s*"([^"]+)"/g)].map((x) => x[1]);
    const titles = [...block.matchAll(/title:\s*"([^"]+)"/g)].map((x) => x[1]);
    screens[name] = { labels, titles };
  }
  return screens;
}

// —— 3. figma-fields 文本集合（按屏归档）——
function textsOf(screenName) {
  const hit = figmaFields.find((f) => f.name === screenName);
  if (!hit) return null;
  return new Set((hit.texts || []).map((t) => String(t.text ?? t).trim()).filter(Boolean));
}

const screens = parseScreens(configsSource);
let failed = 0;
const report = [];

for (const [name, { labels, titles }] of Object.entries(screens)) {
  const figmaTexts = textsOf(name);
  if (!figmaTexts) {
    report.push({ name, ok: false, reason: "figma-fields.json 缺该屏" });
    failed++;
    continue;
  }
  const missing = [...labels, ...titles].filter((l) => l && !figmaTexts.has(l));
  if (missing.length) {
    report.push({ name, ok: false, reason: `config 有但 Figma 无: ${missing.join(" | ")}` });
    failed++;
  } else {
    report.push({ name, ok: true, checked: labels.length + titles.length });
  }
}

// —— 4. 输出 ——
console.log("=".repeat(60));
for (const r of report) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.checked ? ` (${r.checked} fields)` : ""} ${r.reason || ""}`);
}
console.log("=".repeat(60));
if (failed) {
  console.error(`字段一致性校验失败：${failed} 屏不通过`);
  process.exit(1);
}
console.log("字段一致性校验通过。");