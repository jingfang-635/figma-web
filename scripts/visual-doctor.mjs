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