#!/usr/bin/env node
/**
 * Visual gate: Playwright screenshot vs Figma PNG.
 * 三条腿全部达标才算通过（AND）：
 *   1) SSIM >= VISUAL_SSIM_MIN                —— 结构崩塌检测（行错位/单列错排）
 *   2) mismatch < VISUAL_MISMATCH_MAX         —— 像素保真（高对比差异）
 *   3) flatBg 漂移 <= VISUAL_FLATBG_MAX       —— 低对比度盲区（底色/卡片底/容器填充）
 * （1+2 AND 起于 2026-09-25，旧 OR 对留白/拉伸屏假阳性；
 *   3 起于 2026-09-26「关键指标」事故：白卡吞白格，前两条腿双双失明，详见 lib/pixel-metrics.mjs）
 *
 * 另有宽视口自适应锁定（原型帧 1440×1068，窗口更宽时须按比例铺满、不得纵向重排）：
 *   - 同一屏在 1440 与 VISUAL_WIDE_WIDTH 下量同一批 DOM 框：①无横向溢出 ②内容铺满可用宽度
 *     ③每框 y/h 与 1440 一致（只横向自适应）；弹窗为固定尺寸对话框，只校验尺寸不变 + 居中
 *
 * Usage (repo root, with api+web running):
 *   node scripts/visual-gate.mjs                      # 正式闸门（SSIM + 宽视口锁定）
 *   node scripts/visual-gate.mjs --viewport-lock-only  # 只跑宽视口锁定 → viewport-lock.json（visual:round 挂载）
 *   node scripts/visual-gate.mjs --calibrate           # 阈值校准：对已有截图打分 + 结构崩塌自检
 * Env: WEB_URL (default http://localhost:5173)
 *      阈值取自仓库根 .env（loadRootEnv），显式 export 的 env 优先
 *
 * SSIM 引擎：ssim.js（标准 MSSIM，windowSize=11，C1/C2 按 Wang2004）。
 * 阈值语义（2026-09-24 基线校准）：
 *   - 完全一致 = 1.0；当前通过构建的下限 ≈ 0.60（弹窗小图）
 *   - 结构性错位（行整体偏移 8px）会跌到 ~0.5 以下
 *   - 因此 SSIM 作「结构崩塌检测」，像素保真由 mismatch<2% 兜底
 *
 * 配置来源（去硬编码）：
 * - 全屏清单与路由：fixtures/<slug>/app-spec.json → screens（无标杆/非标杆之分）
 * - 登录凭证：env GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD 或 spec.seedAdmin
 * - localStorage key：spec.auth.storageKey（默认 auth_token）
 * - mask：fixtures/<slug>/gate-masks.json（可选）
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject, gateMasks, loadRootEnv } from "./lib/project.mjs";
import { flatBgDrift, flatBgDriftOverlay, FLATBG_DEFAULTS } from "./lib/pixel-metrics.mjs";
import { loadSnapshot } from "./lib/snapshot.mjs";

const CALIBRATE = process.argv.includes("--calibrate");
// 只跑宽视口锁定（不比对标杆图，不需要 imports/figma/screens）：供 visual:round 挂载
const VIEWPORT_LOCK_ONLY = process.argv.includes("--viewport-lock-only");

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);

function loadDep(name) {
  try {
    return require(name);
  } catch {
    console.error(`Missing ${name}. Run: npm install -D playwright pixelmatch pngjs`);
    process.exit(1);
  }
}

const pixelmatch = loadDep("pixelmatch");
const { PNG } = loadDep("pngjs");

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
// 阈值语义：SSIM（ssim.js 标准 MSSIM）作结构崩塌检测，mismatch 作像素保真。
// 0.97 在真 SSIM 下不可达（已校准：整屏通过下限 ≈0.75 / 弹窗 ≈0.60），勿调回。
const SSIM_MIN = Number(process.env.VISUAL_SSIM_MIN || 0.55);
const MISMATCH_MAX = Number(process.env.VISUAL_MISMATCH_MAX || 0.02);
// 低对比度盲区腿（2026-09-26「关键指标」事故）：pixelmatch threshold=0.25 对
// #FFFFFF vs #F5F7FA（亮度差 ~3.9%）完全失明，SSIM 又被整屏稀释 → 需独立判据。
// 默认值取严格侧（.env 未加载则更易失败而非静默放行）。校准：--calibrate
const FLATBG_MAX = Number(process.env.VISUAL_FLATBG_MAX || 0.025);
const FLATBG_MODAL_MAX = Number(process.env.VISUAL_FLATBG_MODAL_MAX || 0.06);
// 宽视口锁定：横向须按可用宽度铺满（右侧只留 padding），纵向骨架不得变化；弹窗水平居中
const WIDE_WIDTH = Number(process.env.VISUAL_WIDE_WIDTH || 1888);
const WIDE_TOL = Number(process.env.VISUAL_WIDE_TOL || 1.5);
const FILL_TOL = Number(process.env.VISUAL_FILL_TOL || 2);
const MODAL_CENTER_TOL = Number(process.env.VISUAL_MODAL_CENTER_TOL || 2);
const VIEWPORT = { width: 1440, height: 1068 };
const outDir = resolve(root, "artifacts/visual-diff");
mkdirSync(outDir, { recursive: true });

// —— 项目配置（app-spec 驱动，不再硬编码业务）——
const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error(
    "No project slug resolved. Run: node scripts/init-project.mjs --slug <slug> --file <fileKey>",
  );
  process.exit(1);
}

/** spec.screens 全屏 → gate targets（modal 用 spec.modal.trigger 匹配按钮） */
function gateTargets() {
  const screens = spec?.screens || [];
  const targets = [];
  const seen = new Set();
  const push = (t) => {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      targets.push(t);
    }
  };
  // 全屏闸门：每个业务屏 + 弹窗都是闸门目标（无标杆/非标杆之分）。
  for (const s of screens) {
    if (seen.has(s.id) || s.needsReview) continue;
    if (s.type === "chrome") continue;
    const isModal = s.type === "modal";
    push({
      id: s.id,
      route: s.route,
      shot: `${s.name}.png`,
      modal: isModal,
      ...(isModal ? { trigger: s.modal?.trigger || /新增/ } : {}),
    });
  }
  return targets;
}

const TARGETS = gateTargets();
/** 可选 mask：{ [screenId]: [{x,y,w,h}] }，来自 gate-masks.json */
const GATE_MASKS = gateMasks(root);

function masksFor(name) {
  return [...(GATE_MASKS[name] || [])];
}

function fillRect(png, x, y, w, h, rgba = [255, 255, 255, 255]) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(png.width, x + w);
  const y1 = Math.min(png.height, y + h);
  for (let row = y0; row < y1; row++) {
    for (let col = x0; col < x1; col++) {
      const i = (row * png.width + col) * 4;
      png.data[i] = rgba[0];
      png.data[i + 1] = rgba[1];
      png.data[i + 2] = rgba[2];
      png.data[i + 3] = rgba[3];
    }
  }
}

/** SSIM 引擎：ssim.js（标准 MSSIM）。入参为 fitPng 后的同尺寸 RGBA。 */
function ssimScore(a, b) {
  const { ssim } = loadDep("ssim.js");
  const { mssim } = ssim(
    { data: a.data, width: a.width, height: a.height },
    { data: b.data, width: b.width, height: b.height },
    { windowSize: 11 },
  );
  return mssim;
}

function fitPng(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x / width) * png.width));
      const sy = Math.min(png.height - 1, Math.floor((y / height) * png.height));
      const si = (sy * png.width + sx) * 4;
      const di = (y * width + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function clipPng(png, x, y, w, h) {
  const width = Math.max(1, Math.min(w, png.width - x));
  const height = Math.max(1, Math.min(h, png.height - y));
  const out = new PNG({ width, height });
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const si = ((y + row) * png.width + (x + col)) * 4;
      const di = (row * width + col) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

/**
 * 合成到白底：Figma 导出的弹窗标杆图带 alpha（阴影为「未预乘」——RGB 暗、alpha 低），
 * 而运行时截图恒为不透明。若直接逐通道比，SSIM 会把 alpha≈3 的阴影像素当成「深灰」，
 * 整条阴影带 SSIM 掉到 0.48（实测某弹窗顶部带），把弹窗 SSIM 从 0.91 拉到 0.83。
 * 两者先各自合成到白底再比，才是同域比较（2026-09-26 弹窗 SSIM 卡在 0.76~0.83 的根因之二）。
 */
function compositeOverWhite(png) {
  const out = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3] / 255;
    if (a >= 1) {
      out.data[i] = png.data[i];
      out.data[i + 1] = png.data[i + 1];
      out.data[i + 2] = png.data[i + 2];
    } else {
      out.data[i] = Math.round(png.data[i] * a + 255 * (1 - a));
      out.data[i + 1] = Math.round(png.data[i + 1] * a + 255 * (1 - a));
      out.data[i + 2] = Math.round(png.data[i + 2] * a + 255 * (1 - a));
    }
    out.data[i + 3] = 255;
  }
  return out;
}

function compare(expectedBuf, actualBuf, name, { modal = false } = {}) {
  let expectedPng = compositeOverWhite(PNG.sync.read(expectedBuf));
  const actualRaw = compositeOverWhite(PNG.sync.read(actualBuf));
    const height = Math.min(expectedPng.height, actualRaw.height, VIEWPORT.height);
  const width = Math.min(expectedPng.width, actualRaw.width, VIEWPORT.width);
  const exp = fitPng(expectedPng, width, height);
    const act = fitPng(actualRaw, width, height);
  writeFileSync(resolve(outDir, `${name}.actual.raw.png`), PNG.sync.write(act));
  const masks = masksFor(name);
  if (masks.length) {
    for (const m of masks) {
      fillRect(exp, m.x, m.y, m.w, m.h);
      fillRect(act, m.x, m.y, m.w, m.h);
    }
  }
  const diff = new PNG({ width, height });
    const threshold = 0.25;
  const mismatch = pixelmatch(exp.data, act.data, diff.data, width, height, { threshold });
  const ratio = mismatch / (width * height);
  const ssim = ssimScore(exp, act);
  // 低对比度盲区：平坦底色漂移（文字渲染差异不计入）
  const flat = flatBgDrift(exp, act);
  const flatMax = modal ? FLATBG_MODAL_MAX : FLATBG_MAX;
  const flatPass = flat.rate <= flatMax;
  writeFileSync(resolve(outDir, `${name}.expected.png`), PNG.sync.write(exp));
  writeFileSync(resolve(outDir, `${name}.actual.png`), PNG.sync.write(act));
  writeFileSync(resolve(outDir, `${name}.diff.png`), PNG.sync.write(diff));
  // 底色错热力图（diff.png 看不见低对比差异，这张专标盲区）
  writeFileSync(resolve(outDir, `${name}.flatbg.png`), PNG.sync.write(flatBgDriftOverlay(exp, act, PNG)));
  const pass = ssim >= SSIM_MIN && ratio < MISMATCH_MAX && flatPass;
  return {
    name, width, height, mismatch, ratio, ssim, pass,
    flatbgRate: flat.rate, flatbgDrift: flat.drift, flatbgArea: flat.area,
    flatbgMax: flatMax, flatbgPass: flatPass,
  };
}

async function waitForWeb() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(WEB_URL, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Web not reachable at ${WEB_URL}. Start npm run api && npm run web first.`);
}

const shotsDir = resolve(root, "imports/figma/screens");
if (!VIEWPORT_LOCK_ONLY && !existsSync(shotsDir)) {
  console.error("Missing imports/figma/screens. Run npm run visual:shots first.");
  process.exit(1);
}

// —— 阈值校准模式：不依赖 api/web，对上次闸门产物打分 + 结构崩塌自检 ——
// 用途：换 SSIM 引擎 / 改渲染后，先跑 `node scripts/visual-gate.mjs --calibrate`
// 确认阈值仍然把「通过构建」与「结构崩塌」分开，再决定 VISUAL_SSIM_MIN。
if (CALIBRATE) {
  const pairs = [];
  for (const f of readdirSync(outDir)) {
    if (!f.endsWith(".actual.png")) continue;
    const base = f.replace(/\.actual\.png$/, "");
    const expPath = resolve(outDir, `${base}.expected.png`);
    if (existsSync(expPath)) pairs.push({ base, expPath, actPath: resolve(outDir, f) });
  }
  if (!pairs.length) {
    console.error("No *.expected.png/*.actual.png pairs in artifacts/visual-diff. Run visual:gate once first.");
    process.exit(1);
  }
  console.log("=== SSIM 阈值校准（ssim.js, windowSize=11）===\n");
  const achieved = [];
  const flatRates = [];
  for (const p of pairs) {
    const exp = PNG.sync.read(readFileSync(p.expPath));
    const act = PNG.sync.read(readFileSync(p.actPath));
    const s = ssimScore(exp, act);
    achieved.push({ name: p.base, ssim: s });
    console.log(`${p.base}: ssim=${s.toFixed(4)}`);
    // 结构崩塌自检：把 actual 下移 8px 后打分——真 SSIM 应显著下跌
    const shifted = new PNG({ width: act.width, height: act.height });
    act.data.copy(shifted.data, 8 * act.width * 4, 0, act.data.length - 8 * act.width * 4);
    const sShift = ssimScore(exp, shifted);
    console.log(`  ↳ 崩塌自检（下移 8px）: ssim=${sShift.toFixed(4)} ${s - sShift > 0.05 ? "✅ 敏感" : "⚠️ 区分度不足"}`);
    // 实测基线（用于建议预算；文字亚像素位置差是主要残余噪声来源）
    const flatOk = flatBgDrift(exp, act);
    const isModal = !!TARGETS.find((t) => t.id === p.base)?.modal;
    flatRates.push({ name: p.base, rate: flatOk.rate, modal: isModal });
    console.log(`  ↳ 平坦底色漂移: ${(flatOk.rate * 100).toFixed(2)}%（${isModal ? "弹窗" : "全屏"}基线）`);
  }
  const floor = Math.min(...achieved.map((a) => a.ssim));
    console.log(`\n当前通过构建的 SSIM 下限 = ${floor.toFixed(4)}`);
  console.log(`建议 VISUAL_SSIM_MIN ≤ ${Math.max(0.5, floor - 0.05).toFixed(2)}（留 0.05 裕量），且远高于崩塌区（~<0.5）`);

  // —— 低对比度盲区腿：度量本身的确定性自检（与屏幕内容无关）——
  // 若有人把 driftTol 抬到 ≥ 白/画布色差（≈9.7）或改坏算法，这一步会立刻报警，
  // 而不是等到「白卡吞白格」再次静默通过。
  const mkFlat = (n, v) => {
    const png = new PNG({ width: n, height: n });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = v; png.data[i + 1] = v; png.data[i + 2] = v; png.data[i + 3] = 255;
    }
    return png;
  };
  const N = 256;
  const white = mkFlat(N, 255);
  const canvas = mkFlat(N, 245); // #F5F7FA 的亮度 ≈ 246.6，用 245 逼近
  // 合成「白卡吞掉一半画布」：左半 #FFFFFF、右半 #F5F7FA
  const half = mkFlat(N, 255);
  for (let y = 0; y < N; y++) {
    for (let x = N / 2; x < N; x++) {
      const i = (y * N + x) * 4;
      half.data[i] = 245; half.data[i + 1] = 247; half.data[i + 2] = 250;
    }
  }
  const ctrl = flatBgDrift(white, white).rate; // 完全相同 → 应 ≈ 0
  const sig = flatBgDrift(half, white).rate; // 画布被白卡吞 → 应 ≈ 50%
  const ok = ctrl < 0.005 && sig > 0.4;
  console.log(`\n平坦底色漂移（rad=${FLATBG_DEFAULTS.rad} flatTol=${FLATBG_DEFAULTS.flatTol} driftTol=${FLATBG_DEFAULTS.driftTol}）`);
  console.log(`  度量自检: 对照(同图)=${(ctrl * 100).toFixed(2)}%  合成事故(半幅画布被白卡吞)=${(sig * 100).toFixed(2)}% ${ok ? "✅ 敏感" : "⚠️ 已失明（driftTol 过大或算法失效）"}`);
  const fullMax = Math.max(...flatRates.filter((f) => !f.modal).map((f) => f.rate), 0);
  const modalMax = Math.max(...flatRates.filter((f) => f.modal).map((f) => f.rate), 0);
  console.log(`  当前基线: 全屏上限 ${(fullMax * 100).toFixed(2)}%  弹窗上限 ${(modalMax * 100).toFixed(2)}%`);
  console.log(`  建议: VISUAL_FLATBG_MAX ≥ ${Math.max(0.01, fullMax * 1.5).toFixed(3)}（基线×1.5，当前 ${FLATBG_MAX}）`);
  console.log(`        VISUAL_FLATBG_MODAL_MAX ≥ ${Math.max(0.01, modalMax * 1.4).toFixed(3)}（弹窗基线×1.4，当前 ${FLATBG_MODAL_MAX}）`);
  console.log("  说明：该腿只判「标杆为平坦色块处运行时是否改色」，文字渲染差异不计入。");
  console.log("\n校准完成（不影响 score.json / 闸门结果）。");
  process.exit(0);
}

await waitForWeb();

// 采集与断言已解耦：截图与 DOM 探针由统一采集趟次产出
// （npm run visual:capture → artifacts/visual-diff/gate-actual/*.png + dom-snapshot.json，
//  见 scripts/capture-screens.mjs）。本闸门不再自己启动浏览器 / 重复导航/截图，
// 只做像素与几何的**纯计算**；快照新鲜度由 lib/snapshot.mjs 校验（过期即拒用）。
const snapshot = loadSnapshot({ root, slug, leg: "视觉闸门" });

/** 门用运行时截图（采集趟次已按弹窗阴影余量补白边，见 capture-screens.mjs）。 */
function gateActual(t) {
  const p = resolve(root, "artifacts/visual-diff/gate-actual", `${t.id}.png`);
  if (!existsSync(p)) {
    throw new Error(`缺少门用截图 ${p} —— 先跑 npm run visual:capture（或 npm run visual:round）`);
  }
  return readFileSync(p);
}

/**
 * 宽视口取样：量一批元素框 + 弹窗（含可用宽度）。
 * 量 DOM 而非比位图：位图重采样有噪声，而「每个框都精确等于 1440 框 × k」是
 * 「按比例自适应」的充要条件，且能直接指出是哪个元素没跟上。
 * 探针由采集趟次在 gate 档/base 档 + 宽档各跑一次（见 lib/dom-collect.mjs 的 PROBE_LAYOUT）。
 */

/**
 * 自适应校验（宽视口）：原型帧是按比例铺满，所以宽档要求
 *   (a) 无横向溢出；(b) 内容确实铺满可用宽度（右侧只留 body padding）；(c) 纵向骨架不变
 *       —— 每个元素的 y / h 与 1440 档一致（±2px），即「只横向自适应，不纵向重排」。
 * 弹窗是固定尺寸对话框：只校验尺寸不变 + 水平居中。
 */
function proportionalLock(base, wide, isModal) {
  const overflow = wide.docScrollW - wide.avail; // >0 = 横向溢出（没按可用宽度收敛）
  if (isModal) {
    const b = base.modal;
    const w = wide.modal;
    if (!b || !w) return { pass: false, error: "弹窗未出现" };
    const sizeDev = Math.max(Math.abs(w.w - b.w), Math.abs(w.h - b.h));
    const centerDev = Math.abs(w.cx - wide.viewportCx) + Math.abs(b.cx - base.viewportCx);
    const tol = Math.max(WIDE_TOL, MODAL_CENTER_TOL);
    return {
      pass: sizeDev <= WIDE_TOL && centerDev <= MODAL_CENTER_TOL,
      kind: "modal",
      worst: { sel: ".ant-modal-content", key: "尺寸+居中", base: `${b.w}x${b.h}@${b.cx}`, wide: `${w.w}x${w.h}@${w.cx}`, expected: `不变，居中 ${base.viewportCx}`, dev: +Math.max(sizeDev, centerDev).toFixed(2), tol },
    };
  }
  if (base.items.length !== wide.items.length) {
    return { pass: false, error: `DOM 数量随视口变化 ${base.items.length} → ${wide.items.length}（发生重排）` };
  }
  if (base.fillGap > FILL_TOL) {
    return { pass: false, error: `1440 档内容未铺满（右侧空 ${base.fillGap}px）` };
  }
  // 纵向骨架：y / h 必须与 1440 档一致
  let worst = null;
  for (let i = 0; i < base.items.length; i++) {
    const a = base.items[i];
    const b = wide.items[i];
    if (a.sel !== b.sel) return { pass: false, error: `DOM 顺序随视口变化 @${i}` };
    for (const key of ["y", "h"]) {
      const dev = Math.abs(b[key] - a[key]);
      if (!worst || dev > worst.dev) {
        worst = { sel: a.sel, key, base: a[key], wide: b[key], expected: `不变（±${WIDE_TOL}px）`, dev: +dev.toFixed(2), tol: WIDE_TOL };
      }
    }
  }
  // 横向铺满：宽档右侧也只留 padding
  const fillOk = wide.fillGap <= FILL_TOL + 1;
  const grew = wide.contentW > base.contentW + 1;
  const pass = overflow <= 0 && fillOk && grew && worst.dev <= WIDE_TOL;
  return { pass, overflow, worst, fillGap: wide.fillGap, contentW: `${base.contentW} → ${wide.contentW}` };
}

const scores = [];
for (const t of TARGETS) {
  if (VIEWPORT_LOCK_ONLY) continue;
  const refPath = resolve(shotsDir, t.shot);
  if (!existsSync(refPath)) {
    console.warn("skip missing ref", t.shot);
    scores.push({ name: t.id, pass: false, error: `missing ${t.shot}` });
    continue;
  }
  let actual;
  try {
    actual = gateActual(t);
  } catch (err) {
    scores.push({ name: t.id, pass: false, error: err.message });
    console.log(`${t.id}: ${err.message} FAIL`);
    continue;
  }
  const result = compare(readFileSync(refPath), actual, t.id, { modal: !!t.modal });
  scores.push(result);
  console.log(
    `${t.id}: ssim=${result.ssim.toFixed(4)} mismatch=${(result.ratio * 100).toFixed(2)}% flatBg=${(result.flatbgRate * 100).toFixed(2)}%(≤${(result.flatbgMax * 100).toFixed(1)}%) ${result.pass ? "PASS" : "FAIL"}`,
  );
}

// —— 宽视口锁定：横向按可用宽度铺满，纵向骨架不变（不得重排 / 留白 / 溢出）——
// 不依赖标杆图：同一屏在原型帧宽与 WIDE 下量同一批 DOM 框，校验「只横向自适应」。
// 两档探针均由采集趟次产出（gate 档 + 宽档），本闸门只做纯比较。
// 弹窗为固定尺寸对话框：只校验尺寸不变 + 水平居中。
const wide = [];
console.log(`\n宽视口锁定 ${VIEWPORT.width} → ${WIDE_WIDTH}（纵向允差 ${WIDE_TOL}px，铺满余量 ≤ ${FILL_TOL}px）`);
for (const t of TARGETS) {
  const base = snapshot.probeBase?.[t.id];
  const wideProbe = snapshot.probeWide?.[t.id];
  if (!base || !wideProbe) {
    wide.push({ name: t.id, pass: false, error: "快照缺该屏探针（重跑 npm run visual:capture）" });
    console.log(`${t.id}: 快照缺该屏探针 FAIL`);
    continue;
  }
  const r = proportionalLock(base, wideProbe, !!t.modal);
  wide.push({ name: t.id, ...r });
  const detail = r.error
    ? r.error
    : r.kind === "modal"
      ? `${r.worst.base} → ${r.worst.wide}（偏差 ${r.worst.dev}px / 允差 ${r.worst.tol}px）`
      : `内容宽 ${r.contentW} 右侧余量 ${r.fillGap}px 纵向最大偏差 ${r.worst ? r.worst.dev : 0}px / 允差 ${WIDE_TOL}px${r.worst ? ` @${r.worst.sel}.${r.worst.key}(${r.worst.base}→${r.worst.wide})` : ""}`;
  console.log(`${t.id}: ${detail} ${r.pass ? "PASS" : "FAIL"}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  webUrl: WEB_URL,
  ssimMin: SSIM_MIN,
  mismatchMax: MISMATCH_MAX,
    ssimEngine: "ssim.js@3.5 (MSSIM windowSize=11)",
  lowContrast: {
    metric: "flatBgDrift（平坦底色漂移，排除文字渲染差异）",
    params: FLATBG_DEFAULTS,
    max: FLATBG_MAX,
    modalMax: FLATBG_MODAL_MAX,
    note: "补 mismatch(threshold=0.25) 对 <25% 色差不敏感的盲区；#FFFFFF vs #F5F7FA ≈ 3.9%",
  },
  mode: VIEWPORT_LOCK_ONLY ? "viewport-lock-only" : "full",
  scores,
  viewportLock: { wideWidth: WIDE_WIDTH, tolPx: WIDE_TOL, fillTol: FILL_TOL, modalCenterTol: MODAL_CENTER_TOL, scores: wide },
};
// 只锁定模式不写 score.json（避免覆盖正式闸门成绩）
const reportFile = VIEWPORT_LOCK_ONLY ? "viewport-lock.json" : "score.json";
writeFileSync(resolve(outDir, reportFile), JSON.stringify(report, null, 2), "utf8");
console.log("Wrote", resolve(outDir, reportFile));

const failed = scores.filter((s) => !s.pass);
const failedWide = wide.filter((s) => !s.pass);
if (failed.length || failedWide.length) {
  if (failed.length) {
    console.error(`Visual gate failed: ${failed.map((f) => f.name).join(", ")}`);
    // 指出是三条腿里的哪条没过（避免"修了 SSIM 却没修底色"的反复）
    for (const f of failed) {
      const reasons = [];
      if (f.ssim < SSIM_MIN) reasons.push(`SSIM ${f.ssim.toFixed(3)} < ${SSIM_MIN}`);
      if (f.ratio >= MISMATCH_MAX) reasons.push(`mismatch ${(f.ratio * 100).toFixed(2)}% ≥ ${(MISMATCH_MAX * 100).toFixed(0)}%`);
      if (f.flatbgPass === false) reasons.push(`低对比底色漂移 ${(f.flatbgRate * 100).toFixed(2)}% > ${(f.flatbgMax * 100).toFixed(1)}%`);
      if (f.error) reasons.push(f.error);
      console.error(`  · ${f.name}: ${reasons.join(" / ") || "unknown"}`);
      if (f.flatbgPass === false) console.error(`    → 看图 artifacts/visual-diff/${f.name}.flatbg.png（洋红=标杆平坦底色被改色）`);
    }
  }
  if (failedWide.length) console.error(`宽视口锁定失败: ${failedWide.map((f) => f.name).join(", ")}`);
  process.exitCode = 1; // 不用 process.exit()：避免 Windows + Playwright 的 libuv 断言崩溃
} else {
  console.log("Visual gate passed.");
}
