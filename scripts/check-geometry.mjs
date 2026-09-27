#!/usr/bin/env node
/**
 * 几何闸门：Layout IR 的「控件框」↔ 运行时 DOM 框 逐框断言
 *
 * 为什么需要这条腿（「像素三腿全过、几何却错」的事故）：
 *   现有三条腿（SSIM / mismatch / flatBg）**全是全屏像素统计量**。表单列宽算错时，
 *   输入框只是「1px 灰边框位移 + 白底缩水」，影响的像素占比极小（mismatch 反而更低、
 *   SSIM 仍在线之上、flatBg 只测「改色」不测「边缘位移」）→ **三腿全过**，而页面明显窄于原型。
 *   结论：缺的不是更严的阈值，而是**判据的维度**——像素统计之外必须有「几何尺寸」这条腿。
 *
 * 判据（配置无关，全部从 Layout IR 派生）：
 *   1. 目标屏 = IR 里存在「控件框」的屏。控件框 = RECTANGLE 且带 `stroke`（边框），
 *      且尺寸像输入控件（h 36~120、w ≥ 80）。
 *      已排除：31px 高的描边按钮（重置/取消等，h<36）、KPI/卡片（无 stroke）、
 *      无描边的灰底装饰（#FAFAFA 无 stroke）。
 *   2. DOM 侧取「最外层」输入控件（`.ant-input-affix-wrapper` 会含内层 input，去重保外层），
 *      按 (y, x) 排序后与 IR 框**一一配对**（数量必须相等）。
 *   3. 每对断言 |dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL（默认 3px，1440 视口）。
 *
 * 为什么不用「按屏写死选择器」：那会把业务几何搬进脚本（违反 app-spec 驱动约定），
 * 且新屏要手写配置 → 必然再次出现盲区。IR 里本来就有精确几何，直接拿来当基准。
 *
 * Usage（仓库根，需 api + web 已启动）：
 *   npm run visual:geom
 *   node scripts/check-geometry.mjs --screen=<spec.screens[].id>   # 单屏
 *   node scripts/check-geometry.mjs --probe                 # 打印每对框的实际偏移
 * Env: WEB_URL / VISUAL_GEO_TOL
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProject, gateCredentials, loadRootEnv } from "./lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const TOL = Number(process.env.VISUAL_GEO_TOL || 3);
const screenArg = (process.argv.find((a) => a.startsWith("--screen=")) || "").split("=")[1];
const probe = process.argv.includes("--probe");

/** 控件框判据：带描边的输入控件（输入框/选择器/日期框/下拉）。
 *  只看 `stroke` 不看 `fill`——原型里搜索框可能无填充（IR 该节点 fill 为空），
 *  只认白底会漏掉它。描边按钮由高度下限排除；KPI/卡片无 stroke 天然排除。
 *  **方形框排除**（|w−h| ≤ 4）：原型里的 80×80「上传图标/医生头像」投放区是无值的图片占位，
 *  不是输入控件，DOM 侧也没有对应控件（会把配对整体错位一格）。 */
export const isControlRect = (n) =>
  n?.type === "RECTANGLE" &&
  !!n.stroke &&
  n.box &&
  n.box.h >= 36 &&
  n.box.h <= 120 &&
  n.box.w >= 80 &&
  Math.abs(n.box.w - n.box.h) > 4;

/**
 * 从 Layout IR 取控件框，换算成「相对 frame 原点」的坐标
 * （IR 的 box 是画布绝对坐标，frame.x/y 是画布上的摆放位置）
 */
export function irControlBoxes(ir) {
  const ox = ir.frame?.x ?? 0;
  const oy = ir.frame?.y ?? 0;
  const out = [];
  (function walk(n) {
    if (!n) return;
    if (isControlRect(n)) {
      out.push({
        id: n.id,
        name: n.name,
        x: n.box.x - ox,
        y: n.box.y - oy,
        w: n.box.w,
        h: n.box.h,
      });
    }
    for (const c of n.children || []) walk(c);
  })(ir.tree);
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** DOM 侧取最外层输入控件框（去重嵌套） */
const DOM_COLLECT = () => {
  const SEL = [
    "input.ant-input",
    "textarea.ant-input",
    ".ant-input-affix-wrapper",
    ".ant-select-selector",
    ".ant-picker",
    ".ant-input-number",
  ].join(",");
  const els = [...document.querySelectorAll(SEL)].filter((e) => {
    if (e.closest(".ant-modal-root")) return false; // 弹窗内部控件由壳屏断言，此处不比
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  });
  const outer = els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
  return outer
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        cls: e.className?.toString?.().slice(0, 48) || e.tagName,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
};

/** 目标屏：IR 含控件框的非 chrome/modal 屏（供 doctor 复算，确认判据未失明） */
export function loadTargets() {
  const { slug, spec } = resolveProject(root);
  if (!slug) {
    console.error("未解析到项目 slug，先跑 npm run init:project");
    process.exit(1);
  }
  const irDir = resolve(root, "fixtures", slug, "layout-ir");
  const targets = [];
  for (const s of spec?.screens || []) {
    if (s.type === "chrome" || s.type === "modal") continue; // modal 由宿主屏壳内断言，暂不单独跑
    if (s.needsReview || !s.route) continue;
    const p = resolve(irDir, `${s.id}.json`);
    if (!existsSync(p)) continue;
    let ir;
    try {
      ir = JSON.parse(readFileSync(p, "utf-8"));
    } catch {
      continue;
    }
    const boxes = irControlBoxes(ir);
    if (!boxes.length) continue; // 该屏 IR 无控件框 → 无几何可断言，跳过（非盲区：本来就没有）
    targets.push({ id: s.id, name: s.name, route: s.route, ir, boxes });
  }
  return targets;
}

async function main() {
  const { chromium } = (() => {
    try {
      return require("playwright");
    } catch {
      console.error("缺少 playwright。Run: npm i -D playwright");
      process.exit(1);
    }
  })();

  const targets = loadTargets().filter(
    (t) => !screenArg || t.id === screenArg || t.name === screenArg,
  );
  if (!targets.length) {
    console.log("无含控件框的屏需要几何断言，跳过。");
    return;
  }

  const { username, password, storageKey } = gateCredentials(root);
  const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.access_token || loginBody.token;
  if (!loginRes.ok || !token) {
    console.error(`登录失败 ${loginRes.status}，请确认 api(3001)/web(5173) 已启动且 seedAdmin 有效`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
  await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, user, storageKey }) => {
      localStorage.setItem(storageKey, token);
      localStorage.setItem(storageKey + "_user", JSON.stringify(user));
    },
    { token, user: loginBody.user, storageKey },
  );

  console.log(
    `📐 几何闸门（Layout IR 控件框 ↔ DOM 框，容差 ${TOL}px，1440 视口）— ${targets.length} 屏\n`,
  );

  let failed = 0;
  const results = [];
  for (const t of targets) {
    const viewport = { width: t.ir.frame?.w || 1440, height: t.ir.frame?.h || 1068 };
    await page.setViewportSize(viewport);
    await page.goto(`${WEB_URL}${t.route}?visualGate=1`, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const dom = await page.evaluate(DOM_COLLECT);

    const problems = [];
    if (dom.length !== t.boxes.length) {
      problems.push(`控件数量不符：IR ${t.boxes.length} 个 vs DOM ${dom.length} 个`);
      if (probe) {
        console.log(`   IR : ${t.boxes.map((b) => `${b.w}x${b.h}@${b.x},${b.y}`).join(" ")}`);
        console.log(`   DOM: ${dom.map((d) => `${d.w}x${d.h}@${d.x},${d.y}`).join(" ")}`);
      }
    }
    const n = Math.min(dom.length, t.boxes.length);
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const e = t.boxes[i];
      const a = dom[i];
      const dev = { dx: a.x - e.x, dy: a.y - e.y, dw: a.w - e.w, dh: a.h - e.h };
      const worst = Math.max(...Object.values(dev).map(Math.abs));
      pairs.push({ ir: e, dom: a, dev, worst });
      if (worst > TOL) {
        problems.push(
          `#${i + 1} IR ${e.w}x${e.h}@(${e.x},${e.y}) vs DOM ${a.w}x${a.h}@(${a.x},${a.y}) ` +
            `→ dx=${dev.dx} dy=${dev.dy} dw=${dev.dw} dh=${dev.dh}（超差 ${worst - TOL}px） ${a.cls}`,
        );
      }
    }

    if (probe && pairs.length) {
      console.log(`   ${t.name} 逐框偏差：`);
      for (const p of pairs) {
        console.log(
          `     ${p.ir.name.padEnd(6)} IR ${String(p.ir.w).padStart(4)}x${String(p.ir.h).padStart(3)}@${String(p.ir.x).padStart(4)},${String(p.ir.y).padStart(4)}` +
            `  DOM ${String(p.dom.w).padStart(4)}x${String(p.dom.h).padStart(3)}@${String(p.dom.x).padStart(4)},${String(p.dom.y).padStart(4)}` +
            `  Δ ${p.dev.dx},${p.dev.dy},${p.dev.dw},${p.dev.dh}`,
        );
      }
    }

    if (problems.length) {
      failed++;
      console.log(`❌ ${t.name} (${t.route}) — ${t.boxes.length} 个控件框`);
      for (const p of problems) console.log(`   · ${p}`);
    } else {
      const worst = pairs.length ? Math.max(...pairs.map((p) => p.worst)) : 0;
      console.log(`✅ ${t.name} (${t.route}) — ${t.boxes.length} 个控件框全部对齐（最大偏差 ${worst}px ≤ ${TOL}px）`);
    }
    results.push({
      screen: t.name,
      route: t.route,
      controlCount: t.boxes.length,
      domCount: dom.length,
      ok: !problems.length,
      problems,
      worst: pairs.length ? Math.max(...pairs.map((p) => p.worst)) : 0,
    });
  }

  await browser.close();
  writeFileSync(
    resolve(root, "artifacts/visual-diff/geometry.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), tol: TOL, results }, null, 2),
  );
  console.log(
    `\n${failed ? `❌ 几何断言失败：${failed} 屏（详见 artifacts/visual-diff/geometry.json）` : "✅ 全部屏控件几何与 Layout IR 一致"}`,
  );
  if (failed) process.exitCode = 1;
}

// 直接执行才跑 main()：doctor 会 import 本模块复算判据（不可带副作用）
const isDirectRun =
  process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
