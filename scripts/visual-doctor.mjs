#!/usr/bin/env node
/**
 * 视觉工具链 pre-flight 自检：还原轮次/闸门启动前 5 秒跑完，
 * 避免「跑起来才修工具」（依赖缺失、服务未启动、凭证失效、参考图缺失…）。
 *
 * 用法：
 *   node scripts/visual-doctor.mjs            # 全量检查（含浏览器启动）
 *   node scripts/visual-doctor.mjs --quick    # 跳过浏览器启动检查
 *
 * 全部通过 exit 0；任一失败 exit 1（打印 ❌ 清单）。
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.mjs";
import { resolveProject, gateCredentials, gateMasks } from "./lib/project.mjs";
import { flatBgDrift, FLATBG_DEFAULTS } from "./lib/pixel-metrics.mjs";
import { loadTargets } from "./check-geometry.mjs";
import { loadTargets as loadTextTargets } from "./check-text.mjs";

const root = resolve(process.cwd());
loadEnv(resolve(root, ".env"));

const require = createRequire(import.meta.url);
const quick = process.argv.includes("--quick");
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";

const results = [];
function check(name, fn) {
  return fn().then(
    (info) => results.push({ name, ok: true, info: info || "" }),
    (err) => results.push({ name, ok: false, info: String(err?.message || err) }),
  );
}
function checkSync(name, fn) {
  try {
    const info = fn();
    results.push({ name, ok: true, info: info || "" });
  } catch (err) {
    results.push({ name, ok: false, info: String(err?.message || err) });
  }
}

// 1. App Spec（单一来源）
checkSync("app-spec 解析", () => {
  const { slug, spec } = resolveProject(root);
  if (!slug) throw new Error("未找到 fixtures/<slug>/app-spec.json，先跑 init:project");
  const bms = spec?.screens?.filter((s) => s.type !== "chrome").length || 0;
  return `slug=${slug} screens(非chrome)=${bms}`;
});

// 2. 依赖可加载
checkSync("依赖（playwright/pixelmatch/pngjs/ssim.js）", () => {
  const missing = [];
  for (const dep of ["playwright", "pixelmatch", "pngjs", "ssim.js"]) {
    try {
      require(dep);
    } catch {
      missing.push(dep);
    }
  }
  if (missing.length) throw new Error(`npm i -D ${missing.join(" ")}`);
  return "playwright / pixelmatch / pngjs / ssim.js";
});

// 3. 闸门凭证
checkSync("闸门凭证", () => {
  const { email, storageKey } = gateCredentials(root);
  return `email=${email} storageKey=${storageKey}`;
});

// 4. Web 可达
await check("Web 可达", async () => {
  const res = await fetch(WEB_URL).catch((e) => {
    throw new Error(`${WEB_URL} 不可达（先 npm run web）: ${e.cause?.code || e.message}`);
  });
  if (!res.ok && res.status !== 404) throw new Error(`${WEB_URL} HTTP ${res.status}`);
  return WEB_URL;
});

// 5. API 登录（走 Vite 代理，与闸门同路径）
await check("API 登录", async () => {
  const { email, password } = gateCredentials(root);
  const res = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch((e) => {
    throw new Error(`登录请求失败: ${e.cause?.code || e.message}`);
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}（账号/seed 是否就绪？）`);
  const body = await res.json().catch(() => ({}));
  if (!body.access_token && !body.token) throw new Error("响应无 access_token/token");
  return "login 200 + token";
});

// 6. Figma 参考截图齐全
checkSync("Figma 参考截图", () => {
  const { spec } = resolveProject(root);
  const dir = resolve(root, "imports/figma/screens");
  if (!existsSync(dir)) throw new Error("缺 imports/figma/screens，先跑 visual:shots");
  const files = new Set(readdirSync(dir));
  const missing = [];
  for (const s of spec?.screens || []) {
    if (s.type === "chrome") continue;
    if (!files.has(`${s.name}.png`)) missing.push(`${s.name}.png`);
  }
  if (missing.length) throw new Error(`缺 ${missing.join(", ")}，重跑 visual:shots`);
  return `${(spec?.screens || []).filter((s) => s.type !== "chrome").length} 张齐全`;
});

// 6b. Layout IR 完整性（2026-09-25 事故：schedules 屏 IR 缺失，页面凭感觉手写，
//     SSIM 只剩 0.5x。IR 缺失的屏必须在进还原轮次/闸门前补齐。）
checkSync("Layout IR 完整性", () => {
  const { slug, spec } = resolveProject(root);
  const irDir = resolve(root, "fixtures", slug || "", "layout-ir");
  if (!existsSync(resolve(irDir, "index.json"))) {
    throw new Error("缺 layout-ir/index.json，先跑 npm run visual:layout");
  }
  const index = JSON.parse(readFileSync(resolve(irDir, "index.json"), "utf-8"));
  const irScreens = new Set((index.frames || []).map((f) => f.id));
  const business = (spec?.screens || []).filter((s) => s.type !== "chrome" && !s.needsReview);
  const missing = business.filter((s) => !irScreens.has(s.id));
  // modal 屏不单独出 IR（其几何随宿主屏抽取），只查非 modal 屏
  const missingScreens = missing.filter((s) => s.type !== "modal");
  if (missingScreens.length) {
    throw new Error(
      `IR 缺屏: ${missingScreens.map((s) => s.id).join(", ")} — 重跑 npm run visual:layout 并确认无 Missing frames 警告`,
    );
  }
  // IR 退化检测：有文件但无 tree（region=0、tree 空 → codegen 无几何可用）
  const degraded = business
    .filter((s) => s.type !== "modal" && irScreens.has(s.id))
    .filter((s) => {
      try {
        const ir = JSON.parse(readFileSync(resolve(irDir, `${s.id}.json`), "utf-8"));
        return !ir.tree || !ir.texts || ir.texts.length === 0;
      } catch {
        return true;
      }
    });
  if (degraded.length) {
    throw new Error(`IR 退化（无 tree/texts）: ${degraded.map((s) => s.id).join(", ")} — 重跑 npm run visual:layout`);
  }
  return `${business.filter((s) => s.type !== "modal").length} 屏 IR 齐全`;
});

// 6c. 弹窗闸门覆盖（2026-09-25 弹窗事故：capture/compare 链路只截路由页，
//     4 个 modal 屏从未进对比，vertical 布局偏差直到人工看图才暴露。
//     modal 屏必须有 trigger，且截图/闸门脚本按 trigger 打开弹窗再截 .ant-modal-content。）
checkSync("弹窗闸门覆盖", () => {
  const { spec } = resolveProject(root);
  const modals = (spec?.screens || []).filter((s) => s.type === "modal");
  const noTrigger = modals.filter((m) => !m.modal?.trigger);
  if (modals.length && noTrigger.length) {
    throw new Error(
      `modal 屏缺 trigger（截图脚本无法打开弹窗）: ${noTrigger.map((m) => m.id).join(", ")} — 在 app-spec.json 补 modal.trigger`,
    );
  }
  if (!modals.length) return "无 modal 屏";
  return `${modals.length} 个 modal 屏均有 trigger（capture/gate 按 trigger 打开截 .ant-modal-content）`;
});

// 6d. 低对比度盲区闸门（2026-09-26「关键指标」事故：白卡吞白格。pixelmatch 的
//     threshold=0.25 对 #FFFFFF vs #F5F7FA（≈3.9% 色差）结构性失明，SSIM 又被整屏稀释，
//     两条腿都没拦住。新增 flatBgDrift 腿后，必须确认它在 .env 里被真正配置——
//     阈值缺失就静默回落代码默认值 = 闸门再次失明（2026-09-26 另一事故：SSIM 阈值
//     未加载，.env 写 0.85 实跑 0.55）。
checkSync("低对比度盲区闸门（flatBg）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（阈值必须从根 .env 经 loadRootEnv 读入）");
  const raw = readFileSync(p, "utf-8");
  const keys = ["VISUAL_SSIM_MIN", "VISUAL_MISMATCH_MAX", "VISUAL_FLATBG_MAX", "VISUAL_FLATBG_MODAL_MAX"];
  const missing = keys.filter((k) => !new RegExp(`^${k}=`, "m").test(raw));
  if (missing.length) {
    throw new Error(`.env 缺阈值 ${missing.join(", ")} — 闸门会静默回落代码默认值（可能更松）`);
  }
  if (typeof flatBgDrift !== "function" || !FLATBG_DEFAULTS?.rad) {
    throw new Error("lib/pixel-metrics.mjs 异常（flatBgDrift/FLATBG_DEFAULTS 不可用）");
  }
  const val = (k) => (raw.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
  return `flatBg 漂移 ≤ ${val("VISUAL_FLATBG_MAX")}（弹窗 ≤ ${val("VISUAL_FLATBG_MODAL_MAX")}），参数 rad=${FLATBG_DEFAULTS.rad} flatTol=${FLATBG_DEFAULTS.flatTol} driftTol=${FLATBG_DEFAULTS.driftTol}`;
});

// 6e. 几何闸门（2026-09-26 机构信息屏事故：三条像素腿全过，页面却比原型窄 164px。
//     像素统计量对「尺寸/位置」偏差结构性失明 → 必须另有一条几何腿：
//     Layout IR 控件框 ↔ 运行时 DOM 框，逐框断言 x/y/w/h。判据从 IR 派生，无业务硬编码。
//     本项同时是「判据未失明」自检——form 屏存在却解析不出控件框 = 判据坏了。）
checkSync("几何闸门（IR↔DOM 控件框）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（VISUAL_GEO_TOL 必须从根 .env 读入，否则静默回落代码默认值）");
  const raw = readFileSync(p, "utf-8");
  if (!/^VISUAL_GEO_TOL=/m.test(raw)) {
    throw new Error(".env 缺 VISUAL_GEO_TOL — 几何闸门容差会静默回落");
  }
  const tol = (raw.match(/^VISUAL_GEO_TOL=(.*)$/m) || [])[1]?.trim();
  if (!existsSync(resolve(root, "scripts/check-geometry.mjs"))) {
    throw new Error("缺 scripts/check-geometry.mjs（npm run visual:geom 会失败）");
  }
  const { spec } = resolveProject(root);
  const targets = loadTargets();
  const boxes = targets.reduce((n, t) => n + t.boxes.length, 0);
  const hasForm = (spec?.screens || []).some((s) => s.type === "form" && !s.needsReview);
  if (!targets.length && hasForm) {
    throw new Error(
      "存在 form 屏却未从 IR 解析出任何控件框 —— 判据可能已失明（查 layout-ir 里的描边 rect 是否还在）",
    );
  }
  return targets.length
    ? `${targets.length} 屏 / ${boxes} 个控件框待断言（容差 ${tol}px）：${targets.map((t) => t.id).join(", ")}`
    : "无含控件框的屏（本屏组无输入控件，几何腿空转）";
});

// 6f. 文本闸门（2026-09-26 弹窗文本事故：4 个弹窗过了像素闸门，但 label 左偏 8px、
//     控件值 14px/字号、占位符灰 vs 深色、多一个 antd 默认冒号、* 该掉行却左溢出。
//     像素腿全是全屏统计量（文本 ink 占弹窗 40 万像素的极小比例，threshold=0.25 看不见）；
//     几何腿只认「带 stroke 的 RECTANGLE」，TEXT 节点不是 rect → 弹窗文本零覆盖。
//     故补文本腿：IR TEXT ↔ DOM 文本盒（逐节点断言位置/字号/颜色）。
//     本项同时是「判据未失明」自检——IR 有 TEXT 节点却解析不出待断言项 = 判据坏了。）
checkSync("文本闸门（IR TEXT ↔ DOM 文本盒）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（VISUAL_TEXT_TOL 必须从根 .env 读入，否则静默回落代码默认值）");
  const raw = readFileSync(p, "utf-8");
  for (const k of ["VISUAL_TEXT_TOL", "VISUAL_TEXT_SIZE_TOL"]) {
    if (!new RegExp(`^${k}=`, "m").test(raw)) {
      throw new Error(`.env 缺 ${k} — 文本闸门容差会静默回落`);
    }
  }
  if (!existsSync(resolve(root, "scripts/check-text.mjs"))) {
    throw new Error("缺 scripts/check-text.mjs（npm run visual:text 会失败）");
  }
  const targets = loadTextTargets();
  const nodes = targets.reduce((n, t) => n + t.texts.length, 0);
  const hasScreens = (resolveProject(root).spec?.screens || []).some((s) => !s.needsReview && s.route);
  if (!targets.length && hasScreens) {
    throw new Error("有屏却未从 IR 解析出任何 TEXT 节点 —— 判据可能已失明（查 layout-ir 的 tree 是否退化）");
  }
  const modals = targets.filter((t) => t.modal).length;
  return targets.length
    ? `${targets.length} 屏 / ${nodes} 个文本节点待断言（含 ${modals} 个弹窗；容差 ${(raw.match(/^VISUAL_TEXT_TOL=(.*)$/m) || [])[1]?.trim()}px，字号 ${(raw.match(/^VISUAL_TEXT_SIZE_TOL=(.*)$/m) || [])[1]?.trim()}px）`
    : "无含 TEXT 节点的屏（文本腿空转）";
});

// 7. gate-masks.json 可解析（可选）
checkSync("gate-masks.json", () => {
  const masks = gateMasks(root);
  const n = Object.keys(masks).length;
  return n ? `${n} 屏配置 mask` : "未配置（可选）";
});

// 8. 产物目录可写
checkSync("artifacts/visual-diff 可写", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = resolve(root, "artifacts/visual-diff");
  mkdirSync(dir, { recursive: true });
  const probe = resolve(dir, ".doctor-probe");
  writeFileSync(probe, "ok");
  rmSync(probe, { force: true });
  return dir;
});

// 9. Playwright 浏览器可启动（最贵的检查放最后；--quick 跳过）
if (!quick) {
  await check("Playwright chromium 启动", async () => {
    const { chromium } = require("playwright");
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: "chrome" });
      return "channel=chrome";
    } catch {
      browser = await chromium.launch({ headless: true });
      return "bundled chromium";
    } finally {
      await browser?.close().catch(() => {});
    }
  });
}

// —— 输出 ——
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.info ? "  — " + r.info : ""}`);
}
if (failed.length) {
  console.error(`\nvisual:doctor 未通过（${failed.length} 项）：先修复上面 ❌ 再进还原轮次/闸门。`);
  // 不用 process.exit()：Windows + Playwright 下硬退出会触发 libuv 断言崩溃（UV_HANDLE_CLOSING）
  process.exitCode = 1;
} else {
  console.log("\n视觉工具链自检全部通过，可以跑 visual:round / visual:gate。");
}