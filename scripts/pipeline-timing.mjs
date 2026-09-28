#!/usr/bin/env node
/**
 * 流水线编排 + 耗时打点 + 预算判定（无业务语义）。
 *
 * 为什么需要：此前「全量生成耗时」没有任何落盘数据（GENERATED.md 引用的
 * `artifacts/pipeline-timing.log` 其实并不存在），于是「≤ N 分钟」既无法验证也无法阻断；
 * 另外链路定义散在 package.json 的长 `&&` 串里，多个入口各写一份 → 必然漂移。
 * 本脚本是**唯一**的链路定义处：`visual:all` / `visual:round` 都委托到这里。
 *
 * 用法：
 *   node scripts/pipeline-timing.mjs --run=all     # 生成链（拉 Figma → 闸门组）
 *   node scripts/pipeline-timing.mjs --run=round   # 还原轮次链
 *   node scripts/pipeline-timing.mjs --run=full    # 生成链 + 服务就绪闸
 *   node scripts/pipeline-timing.mjs --report      # 只打印最近一次打点 + 预算判定
 * 预算键（.env，未配置则只报告不阻断）：PIPELINE_BUDGET_SEC
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject, loadRootEnv } from "./lib/project.mjs";

const root = resolve(process.cwd());
loadRootEnv(root);

/**
 * 链路定义（唯一处）。每个阶段是一个 npm script 名 + 可选参数。
 * 阶段顺序即依赖顺序：**服务就绪 → 抽取 → codegen → 采集 → 断言组 →（轮次）服务就绪**。
 *
 * 为什么每条链路都以 `dev:up` 开头：它是幂等的（已在跑即跳过，~1s），
 * 但能消掉整类失败——「忘了先起服务 → 采集 ECONNREFUSED」（冷启动链路上必然踩）。
 * 为什么 `round` / `full` 结尾再放一次：还原轮次的收尾必须留下可访问的 api + web，
 * 否则用户点开就是打不开的站点、下一轮也无从开跑（幂等，已在跑时几乎零成本）。
 */
const PIPELINES = {
  all: [
    "dev:up",
    "visual:layout",
    "visual:extract",
    "visual:shots",
    "visual:gen",
    "visual:assets",
    "visual:capture",
    "visual:fields",
    "visual:gate",
    "visual:text",
    "visual:data",
    "visual:geom",
  ],
  round: [
    "dev:up",
    ["visual:doctor", "--", "--quick"],
    "visual:capture",
    "visual:compare",
    ["visual:gate", "--", "--viewport-lock-only"],
    "visual:text",
    "visual:data",
    "visual:geom",
    "dev:up",
  ],
  full: [
    "dev:up",
    "visual:layout",
    "visual:extract",
    "visual:shots",
    "visual:gen",
    "visual:assets",
    "visual:capture",
    "visual:fields",
    "visual:gate",
    "visual:text",
    "visual:data",
    "visual:geom",
    "dev:up",
  ],
};

const timingFile = resolve(root, "artifacts/pipeline-timing.json");

function loadTiming() {
  if (!existsSync(timingFile)) return { runs: [] };
  try {
    return JSON.parse(readFileSync(timingFile, "utf8"));
  } catch {
    return { runs: [] };
  }
}

function budget() {
  const n = Number(process.env.PIPELINE_BUDGET_SEC);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}m${s.toFixed(1)}s` : `${s.toFixed(1)}s`;
}

/** 打印打点表 + 预算判定；over=true 表示超预算。 */
function report(record, { label = "打点" } = {}) {
  if (!record) {
    console.log("（无打点记录：先跑 npm run pipeline:all 或 npm run pipeline:round）");
    return { over: false };
  }
  const b = budget();
  const stages = record.stages || [];
  console.log(`\n⏱  流水线${label}（${record.mode}，${record.startedAt}）`);
  console.log("   " + "阶段".padEnd(20) + "耗时".padStart(10));
  for (const s of stages) {
    console.log("   " + s.name.padEnd(20) + fmt(s.sec).padStart(10) + (s.ok ? "" : "  ❌"));
  }
  console.log("   " + "─".repeat(30));
  console.log("   " + "合计".padEnd(20) + fmt(record.totalSec).padStart(10));
  if (b === null) {
    console.log(`\n   预算：未配置 PIPELINE_BUDGET_SEC（仅报告，不阻断）`);
    return { over: false };
  }
  const over = record.totalSec > b;
  console.log(
    `\n   预算：${fmt(b)}  实际：${fmt(record.totalSec)}  余量：${fmt(Math.abs(b - record.totalSec))}` +
      (over ? "  ❌ 超预算" : "  ✅ 在预算内"),
  );
  return { over };
}

function stageName(spec) {
  return Array.isArray(spec) ? spec[0] : spec;
}

async function runPipeline(mode) {
  const stages = PIPELINES[mode];
  if (!stages) {
    console.error(`未知链路 "${mode}"（可用：${Object.keys(PIPELINES).join(" / ")}）`);
    process.exit(1);
  }
  const { slug } = resolveProject(root);
  if (!slug) {
    console.error("未解析到项目 slug，先跑 npm run init:project");
    process.exit(1);
  }

  console.log(`🚀 流水线 ${mode}（${stages.length} 阶段，slug=${slug}）\n`);
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  const records = [];
  let failed = false;

  for (const spec of stages) {
    const name = stageName(spec);
    const args = Array.isArray(spec) ? spec.slice(1) : [];
    console.log(`\n▶ ${name}${args.length ? " " + args.join(" ") : ""}`);
    const s0 = performance.now();
    // Windows 下 .cmd 不能直接 spawn（Node ≥18 拒绝），但用 shell:true 会触发 DEP0190
    // （参数未转义）→ 显式经 cmd.exe 调用，保持 shell:false。
    const cmd = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
    const argv =
      process.platform === "win32"
        ? ["/d", "/s", "/c", `npm run ${[name, ...args].join(" ")}`]
        : ["run", name, ...args];
    const r = spawnSync(cmd, argv, { stdio: "inherit", env: process.env });
    if (r.error) console.error(`   spawn 失败：${r.error.message}`);
    const sec = (performance.now() - s0) / 1000;
    const ok = r.status === 0;
    records.push({ name, sec: Math.round(sec * 10) / 10, ok });
    console.log(`${ok ? "✅" : "❌"} ${name} — ${fmt(sec)}`);
    if (!ok) {
      failed = true;
      console.error(`\n❌ 阶段 ${name} 失败（exit ${r.status}），后续阶段不再执行。`);
      break;
    }
  }

  const totalSec = (performance.now() - t0) / 1000;
  const record = {
    mode,
    slug,
    startedAt,
    finishedAt: new Date().toISOString(),
    totalSec: Math.round(totalSec * 10) / 10,
    ok: !failed,
    stages: records,
  };

  const data = loadTiming();
  data.runs = [...(data.runs || []), record].slice(-20);
  mkdirSync(resolve(root, "artifacts"), { recursive: true });
  writeFileSync(timingFile, JSON.stringify(data, null, 2));

  const { over } = report(record);
  if (failed) process.exit(1);
  if (over) process.exitCode = 1;
}

const reportOnly = process.argv.includes("--report");
const mode = (process.argv.find((a) => a.startsWith("--run=")) || "").split("=")[1];

if (reportOnly || !mode) {
  const data = loadTiming();
  report((data.runs || []).at(-1), { label: "最近一次" });
  const b = budget();
  const over = b !== null && (data.runs || []).at(-1)?.totalSec > b;
  if (reportOnly && over) process.exitCode = 1;
} else {
  await runPipeline(mode);
}
