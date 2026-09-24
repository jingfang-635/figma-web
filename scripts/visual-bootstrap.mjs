#!/usr/bin/env node
/**
 * 一键流水线：init → 抽取(layout/extract/shots/assets) → gen → db → 起服务 → 闸门
 *
 * 目标：换新原型时一条命令到「第一轮还原就绪」。耗时优化：
 *   - Figma REST 抽取（慢，网络 IO）与 Maven/npm 构建准备（CPU IO）并行
 *   - 前端页面代码生成后，还原轮次（visual:round）一条龙：自检→截图→对比→差异报告
 *
 * Usage:
 *   node scripts/visual-bootstrap.mjs --slug <slug> --file <fileKey或URL> [--stack C] [--skip-webgen]
 *     --stack      栈 ID（A/A2/B/C/D，写进 spec.stack；缺省则要求 spec 已填或交互确认）
 *     --skip-webgen 跳过后端/前端 codegen（代码已存在时用，如本次演练）
 *
 * 阶段输出 artifacts/bootstrap.json（每阶段耗时，供复盘优化）。
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.mjs";

const root = resolve(process.cwd());
loadEnv(resolve(root, ".env"));

const args = process.argv.slice(2);
const argOf = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SLUG = argOf("slug");
const FILE = argOf("file");
const STACK = argOf("stack");
const SKIP_WEBGEN = args.includes("--skip-webgen");
if (!SLUG || !FILE) {
  console.error("Usage: node scripts/visual-bootstrap.mjs --slug <slug> --file <fileKey或URL> [--stack C] [--skip-webgen]");
  process.exit(1);
}

const timings = [];

// —— stack 元信息（spec 驱动，仅 ID → 描述映射；须在阶段 2 使用前声明）——
const STACK_INFO = {
  A: { language: "node", frontend: "react-vite", backend: "nest", database: "mysql", orm: "prisma" },
  A2: { language: "node", frontend: "react-vite", backend: "nest", database: "postgresql", orm: "prisma" },
  B: { language: "node", frontend: "react-vite", backend: "nest", database: "sqlite", orm: "prisma" },
  C: { language: "java", frontend: "react-vite", backend: "spring-boot", database: "mysql", orm: "jpa" },
  D: { language: "java", frontend: "react-vite", backend: "spring-boot", database: "mysql", orm: "mybatis" },
};

const t0 = Date.now();
const mark = (name, t0s) => timings.push({ stage: name, ms: Date.now() - t0s });
const run = (cmd, opts = {}) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
};
const runAsync = (cmd, opts = {}) =>
  new Promise((resolveP, rejectP) => {
    console.log(`⏵ (bg) ${cmd}`);
    const child = spawn(cmd, { shell: true, stdio: ["ignore", "pipe", "pipe"], cwd: root, ...opts });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("exit", (code) => (code === 0 ? resolveP(out) : rejectP(new Error(`${cmd} exit ${code}\n${out.slice(-2000)}`))));
  });

// —— 阶段 1：init-project（拉 Figma 结构 + spec 骨架）——
let t = Date.now();
if (!existsSync(resolve(root, "fixtures", SLUG, "app-spec.json"))) {
  run(`node scripts/init-project.mjs --slug ${SLUG} --file ${FILE} --yes`);
} else {
  console.log(`spec 已存在，跳过 init（fixtures/${SLUG}/app-spec.json）`);
}
mark("init-project", t);

// —— 阶段 2：stack 校验/回填 + 人工闸门检查 ——
t = Date.now();
const specPath = resolve(root, "fixtures", SLUG, "app-spec.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
if (STACK && (!spec.stack?.id || spec.stack.id !== STACK)) {
  spec.stack = { id: STACK, ...STACK_INFO[STACK] };
  writeFileSync(specPath, JSON.stringify(spec, null, 2), "utf8");
}
if (!spec.stack?.id) {
  console.error("\n❌ spec.stack 未填写 —— App Spec 人工闸门：先在 fixtures/" + SLUG + "/app-spec.json 填 stack/entities/seedAdmin 再重跑。");
  process.exitCode = 1;
} else if ((spec.screens || []).some((s) => s.needsReview)) {
  console.error("\n❌ App Spec 人工闸门未过：screens 存在 needsReview=true —— 请人工确认实体/路由后重跑。");
  process.exitCode = 1;
}
if (process.exitCode) {
  console.error("\nbootstrap 在 App Spec 闸门停止（这是设计行为：不猜业务）。");
  timings.push({ stage: "gate-check", ms: Date.now() - t, blocked: true });
  writeFileSync(resolve(root, "artifacts", "bootstrap.json"), JSON.stringify({ timings }, null, 2));
  process.exit(process.exitCode || 1);
}
mark("gate-check", t);

// —— 阶段 3：并行 = [Figma 视觉抽取] ‖ [数据库准备] ——
t = Date.now();
console.log("\n=== 并行阶段：Figma 抽取 ‖ db:create ===");
const extractP = runAsync("node scripts/extract-layout-ir.mjs")
  .then(() => runAsync("node scripts/extract-visual-ir.mjs"))
  .then(() => runAsync("node scripts/export-screenshots.mjs"))
  .then(() => runAsync("node scripts/export-all-screens.mjs"))
  .then(() => runAsync("node scripts/export-assets.mjs"));
const dbP = runAsync("node scripts/create-db.mjs").catch((e) => {
  console.warn("db:create 失败（可能已存在/服务未起，闸门前 doctor 会再查）:", e.message.split("\n")[0]);
});
await Promise.allSettled([extractP, dbP]);
mark("parallel-extract+db", t);

// —— 阶段 4：生成前端资产 + screenConfigs（依赖 IR）——
t = Date.now();
run("node scripts/generate-tokens-css.mjs");
run("node scripts/generate-blueprints.mjs");
run("node scripts/generate-screen-configs.mjs");
mark("visual-gen", t);

// —— 阶段 5：backend codegen（可选）——
if (!SKIP_WEBGEN) {
  t = Date.now();
  run("node scripts/gen-backend.mjs");
  mark("gen-backend", t);
}

// —— 阶段 6：字段一致性 + 起服务冒烟由人工/agent 完成；此处汇总 ——
const total = Date.now() - t0;
const summary = { slug: SLUG, stack: spec.stack?.id, totalMs: total, timings };
mkdirSync(resolve(root, "artifacts"), { recursive: true });
writeFileSync(resolve(root, "artifacts", "bootstrap.json"), JSON.stringify(summary, null, 2));
console.log("\n" + "=".repeat(60));
console.log(`✅ bootstrap 完成（${(total / 1000).toFixed(1)}s）`);
for (const { stage, ms } of timings) console.log(`   ${stage.padEnd(24)} ${(ms / 1000).toFixed(1)}s`);
console.log("=".repeat(60));
console.log("\n下一步：");
console.log("  1. 写前端页面（Blueprint + screenConfigs + 列表模板）");
console.log("  2. npm run api  # 起 Spring Boot（首次 ~18s）");
console.log("  3. npm run web  # 起 Vite");
console.log("  4. npm run visual:fields && npm run visual:gate   # 双闸门");
console.log("  5. npm run visual:round   # 还原轮次（内置 doctor 自检）");