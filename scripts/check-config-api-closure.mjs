#!/usr/bin/env node
/**
 * config ↔ API 闭环闸门（防 stats key 落空显示 0，2026-09-25 机构页 KPI 全 0 事故）
 *
 * 断言：screenConfigs.ts 中每个屏的 stats[].key，必须能在后端对应资源路由源码里
 * 找到真实产出点（Java: m.put("<key>" / TS: ["<key>"] 赋值），否则该 KPI 永远显示兜底 0。
 *
 * 机制：spec.screens[].route → resource 池（route=/ → dashboard 池；其余按 resource 名，
 * dashboard 聚合接口永远入池）；key 产出点匹配 Java m.put("<key>") / TS "<key>": 模式。
 *
 * Usage: node scripts/check-config-api-closure.mjs
 * Exit:  有未闭环 key 即 exit 1
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const configsPath = resolve(root, "apps/web/src/generated/screenConfigs.ts");
if (!existsSync(configsPath)) {
  console.error("❌ screenConfigs.ts 不存在，请先 npm run visual:gen");
  process.exit(1);
}

// —— 后端源码收集（java / ts 皆可，按栈自适应）——
function collectSourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) collectSourceFiles(p, out);
    else if (/\.(java|ts|js|mjs)$/.test(f) && !/node_modules|target|dist/.test(p)) out.push(p);
  }
  return out;
}

const apiDirs = [resolve(root, "apps/api/src"), resolve(root, "apps/api/app")].filter(existsSync);
const apiSources = apiDirs.flatMap((d) => collectSourceFiles(d)).map((p) => ({
  path: p,
  src: readFileSync(p, "utf8"),
}));

// —— 解析 screenConfigs（生成文件，结构稳定：name/route/stats[].key）——
const src = readFileSync(configsPath, "utf8");
const screens = [];
const screenRe = /"name":\s*"([^"]+)"[\s\S]{0,400}?"route":\s*"([^"]+)"[\s\S]{0,2400}?(?="name":|\];)/g;
let m;
while ((m = screenRe.exec(src)) !== null) {
  const block = m[0];
  const stats = [...block.matchAll(/"stats"\s*:\s*\[([\s\S]*?)\]/g)].flatMap((x) =>
    [...x[1].matchAll(/"key":\s*"([^"]+)"/g)].map((k) => k[1]),
  );
  if (stats.length) screens.push({ name: m[1], route: m[2], stats });
}

if (!screens.length) {
  console.log("screenConfigs 无 stats 屏，无需闭环校验。");
  process.exit(0);
}

let failed = 0;
console.log(`📋 config ↔ API 闭环校验 — ${screens.length} 个含 stats 的屏\n`);
for (const s of screens) {
  // 该屏 resource 对应的后端源文件池（route=/ → dashboard 池；dashboard 聚合永远入池）
  const resource = s.route.replace(/^\//, "");
  const paths = resource ? [resource, "dashboard"] : ["dashboard"];
  const candidates = apiSources.filter(({ path, src }) =>
    paths.some(
      (p) =>
        src.includes(`@RequestMapping("/api/${p}")`) ||
        src.includes(`@RequestMapping("/${p}")`) ||
        (p === "dashboard" && /DashboardController/i.test(path)),
    ),
  );
  const pool = candidates.length ? candidates : apiSources; // 找不到专属 controller 时全局兜底
  const missing = [];
  for (const key of s.stats) {
    const produced = pool.some(({ src }) =>
      new RegExp(`(put|set)\\(\\s*["']${key}["']`).test(src) ||
      new RegExp(`["']${key}["']\\s*:`).test(src),
    );
    if (!produced) missing.push(key);
  }
  if (missing.length) {
    failed++;
    console.log(`❌ ${s.name} (${s.route}): stats key 未在后端产出 → ${missing.join(", ")}`);
  } else {
    console.log(`✅ ${s.name}: ${s.stats.length} 个 stats key 全部闭环`);
  }
}

console.log("");
if (failed) {
  console.error(`❌ 闭环校验失败：${failed} 屏的 stats key 在后端无产出点（KPI 将永远显示 0）`);
  process.exit(1);
}
console.log("✅ config ↔ API 闭环校验通过。");