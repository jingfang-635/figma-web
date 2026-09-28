#!/usr/bin/env node
/**
 * 单一采集趟次：一趟导航同时产出「运行时截图 + DOM 采集快照 + 宽视口探针」。
 *
 * 为什么合并（原实现的结构性浪费）：
 *   capture / check-text / check-geometry / check-data-backfill / check-live-data /
 *   visual-gate-lock **各自启动浏览器、各自登录、各自把全部屏导航一遍**——一轮下来
 *   6 次启动、约 45 次导航、截图跑 3 遍（capture 一遍、gate 又一遍、lock 再一遍），
 *   而它们的导航目标完全重叠。这里把「采集」与「断言」拆开：
 *   本脚本负责**采一次**（gate 档 + live 档 + 宽档 + base 探针），
 *   各腿只读 `artifacts/visual-diff/dom-snapshot.json` 做纯断言（不再开浏览器）。
 *
 * 产物（路径与既有消费方保持兼容）：
 *   artifacts/visual-diff/round-<n>/actuals/<屏名>.png  + manifest.json  ← visual-compare
 *   artifacts/visual-diff/gate-actual/<id>.png                           ← visual-gate
 *   artifacts/visual-diff/dom-snapshot.json                              ← 文本/几何/回填/活数据腿
 *
 * 用法：
 *   node scripts/capture-screens.mjs [--round=N] [--screens=<id>,<id>] [--no-live] [--no-wide]
 * 视口一律取 Layout IR（viewportForScreen），脚本内不写死任何屏尺寸。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { resolveProject, gateCredentials, shadowPad, viewportForScreen, loadRootEnv } from "./lib/project.mjs";
import { computeSourcesHash } from "./lib/snapshot.mjs";
import { loadPlaywright, openSession, openRoute, openModal, closeSession, waitStable, waitBoxStable } from "./lib/browser-session.mjs";
import {
  COLLECT_TEXT,
  COLLECT_GEOMETRY,
  COLLECT_BACKFILL,
  COLLECT_LIVE,
  PROBE_SELECTORS,
  PROBE_LAYOUT,
} from "./lib/dom-collect.mjs";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");
const root = resolve(process.cwd());
loadRootEnv(root);

const args = process.argv.slice(2);
const round = (args.find((a) => a.startsWith("--round=")) || "--round=1").split("=")[1];
const screensArg = (args.find((a) => a.startsWith("--screens=")) || "").split("=")[1];
const targetScreens = screensArg ? screensArg.split(",") : null;
const doLive = !args.includes("--no-live");
const doWide = !args.includes("--no-wide");

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
// 宽视口宽度属通用闸门参数，取 .env（不写死）
const WIDE_WIDTH = Number(process.env.VISUAL_WIDE_WIDTH || 1888);

const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error("❌ 未解析到项目 slug，先跑 npm run init:project");
  process.exit(1);
}
const credentials = gateCredentials(root);

const keep = (s) => !targetScreens || targetScreens.some((x) => String(s.id).includes(x) || String(s.name).includes(x));

/** 目标屏：spec.screens 全量（非 chrome），含弹窗（trigger 驱动）。 */
const screens = (spec?.screens || []).filter((s) => s.type !== "chrome" && !s.needsReview && s.route && keep(s));
const pages = screens.filter((s) => s.type !== "modal");
const modals = screens.filter((s) => s.type === "modal");

/**
 * 弹窗的**视口**必须取宿主屏的 IR frame，而不是弹窗自己的 IR frame——
 * 弹窗 IR 的 frame 是「弹窗卡片自身尺寸」（如 520×739），拿它当浏览器视口会把
 * 整个后台布局压到 520px 宽，label 列 / 复选框行全部重排（实测 dy=68 的换行错位）。
 * 弹窗自己的 IR frame 只用于「卡片尺寸」类判据，不用于视口。
 */
const hostViewportFor = (modal) => {
  const host = pages.find((p) => p.route === modal.route) || pages[0];
  if (!host) throw new Error(`弹窗 ${modal.id} 找不到宿主屏（route=${modal.route}）`);
  return viewportForScreen(root, host.id);
};

if (!pages.length && !modals.length) {
  console.error("❌ 无可采集屏（检查 spec.screens 的 route/type/needsReview）");
  process.exit(1);
}

/** 弹窗截图补白边：按 IR 阴影余量四边补（余量从 IR 派生，见 lib/project.mjs shadowPad）。 */
function padWhite(buf, pad) {
  if (!pad || (!pad.left && !pad.right && !pad.top && !pad.bottom)) return buf;
  const inner = PNG.sync.read(buf);
  const padded = new PNG({
    width: inner.width + pad.left + pad.right,
    height: inner.height + pad.top + pad.bottom,
  });
  padded.data.fill(255);
  PNG.bitblt(inner, padded, 0, 0, inner.width, inner.height, pad.left, pad.top);
  return PNG.sync.write(padded);
}

const actualsDir = resolve(root, `artifacts/visual-diff/round-${round}/actuals`);
const gateActualDir = resolve(root, "artifacts/visual-diff/gate-actual");
mkdirSync(actualsDir, { recursive: true });
mkdirSync(gateActualDir, { recursive: true });

const snapshot = {
  generatedAt: new Date().toISOString(),
  webUrl: WEB_URL,
  slug,
  round: Number(round),
  // 判据来源指纹：各腿读快照时重算比对，过期即拒用（防陈旧快照静默放行）
  sourcesHash: computeSourcesHash(root, slug),
  gate: {},
  live: {},
  probeBase: {},
  probeWide: {},
  failures: [],
};

const records = [];
const fail = (id, stage, message) => {
  snapshot.failures.push({ id, stage, message });
  console.error(`      ❌ ${stage}：${message}`);
};

async function captureModalShot(page, id, dest) {
  const content = page.locator(".ant-modal-content").last();
  const box = await content.boundingBox();
  if (!box) throw new Error("modal content not visible");
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
  };
  const shot = await page.screenshot({ type: "png", clip, animations: "disabled", caret: "hide" });
  const padded = padWhite(shot, shadowPad(root, id));
  writeFileSync(dest, padded);
  writeFileSync(resolve(gateActualDir, `${id}.png`), padded);
  return { clip, bytes: padded.length };
}

async function capturePageShot(page, id, dest) {
  const shot = await page.screenshot({ fullPage: false, animations: "disabled", caret: "hide" });
  writeFileSync(dest, shot);
  writeFileSync(resolve(gateActualDir, `${id}.png`), shot);
  return { bytes: shot.length };
}

async function main() {
  const playwright = loadPlaywright();
  console.log(`🔄 采集趟次 round=${round}：${pages.length} 屏 + ${modals.length} 弹窗\n`);

  const session = await openSession({
    playwright,
    webUrl: WEB_URL,
    credentials,
    viewport: { width: 1440, height: 1068 },
  });
  const { page } = session;

  try {
    for (const s of pages) {
      const viewport = viewportForScreen(root, s.id);
      const name = s.name;
      const dest = resolve(actualsDir, `${name}.png`);
      console.log(`   屏：${name} (${s.route}) @${viewport.width}×${viewport.height}`);

      // ① gate 档：截图 + 文本/几何采集 + base 宽视口探针（同一次导航，零额外往返）
      try {
        await openRoute(page, WEB_URL, s.route, viewport, { gate: true });
        const shot = await capturePageShot(page, s.id, dest);
        const text = await page.evaluate(COLLECT_TEXT, { modal: false });
        const geo = await page.evaluate(COLLECT_GEOMETRY);
        const probe = await page.evaluate(PROBE_LAYOUT, PROBE_SELECTORS);
        snapshot.gate[s.id] = {
          texts: text?.texts || [],
          controls: text?.controls || [],
          graphics: text?.graphics || [],
          geoControls: geo || [],
        };
        snapshot.probeBase[s.id] = probe;
        records.push({ name, route: s.route, path: dest, status: "success", viewport, id: s.id, bytes: shot.bytes });
        console.log(`      ✅ 截图 ${shot.bytes}B，文本 ${snapshot.gate[s.id].texts.length} 项，控件 ${geo.length} 个`);
      } catch (error) {
        fail(s.id, "gate 采集", error.message);
        records.push({ name, route: s.route, path: null, status: "failed", error: error.message, viewport, id: s.id });
        continue;
      }

      // ② live 档（真实接口，非 gate）：回填值 + 正文 + 表格行
      if (doLive) {
        try {
          await openRoute(page, WEB_URL, s.route, viewport, { gate: false });
          const backfill = await page.evaluate(COLLECT_BACKFILL);
          const live = await page.evaluate(COLLECT_LIVE);
          snapshot.live[s.id] = {
            formVals: backfill?.formVals || {},
            kpis: backfill?.kpis || {},
            bodyText: live?.bodyText || backfill?.bodyText || "",
            tableRows: live?.tableRows || [],
          };
          console.log(`      ✅ live 采集：表单 ${Object.keys(snapshot.live[s.id].formVals).length} 字段`);
        } catch (error) {
          fail(s.id, "live 采集", error.message);
        }
      }

      // ③ 宽档：仅探测（不截图），用于「只横向自适应」校验
      if (doWide) {
        try {
          await openRoute(page, WEB_URL, s.route, { width: WIDE_WIDTH, height: viewport.height }, { gate: true });
          snapshot.probeWide[s.id] = await page.evaluate(PROBE_LAYOUT, PROBE_SELECTORS);
        } catch (error) {
          fail(s.id, "宽视口探测", error.message);
        }
      }
    }

    for (const m of modals) {
      const viewport = hostViewportFor(m);
      const dest = resolve(actualsDir, `${m.name}.png`);
      const trigger = m.modal?.trigger;
      console.log(`   弹窗：${m.name} (${m.route}, trigger: ${trigger})`);
      if (!trigger) {
        fail(m.id, "弹窗采集", "spec 缺 modal.trigger");
        records.push({ name: m.name, route: m.route, path: null, status: "failed", modal: true, error: "缺 trigger", viewport, id: m.id });
        continue;
      }
      try {
        await openRoute(page, WEB_URL, m.route, viewport, { gate: true });
        await openModal(page, trigger);
        const shot = await captureModalShot(page, m.id, dest);
        const text = await page.evaluate(COLLECT_TEXT, { modal: true });
        snapshot.gate[m.id] = {
          texts: text?.texts || [],
          controls: text?.controls || [],
          graphics: text?.graphics || [],
          geoControls: [],
        };
        snapshot.probeBase[m.id] = await page.evaluate(PROBE_LAYOUT, PROBE_SELECTORS);
        records.push({ name: m.name, route: m.route, path: dest, status: "success", modal: true, viewport: shot.clip, id: m.id, bytes: shot.bytes });

        if (doWide) {
          await openRoute(page, WEB_URL, m.route, { width: WIDE_WIDTH, height: viewport.height }, { gate: true });
          await openModal(page, trigger);
          snapshot.probeWide[m.id] = await page.evaluate(PROBE_LAYOUT, PROBE_SELECTORS);
        }
        console.log(`      ✅ 弹窗 ${shot.clip.width}×${shot.clip.height}，文本 ${snapshot.gate[m.id].texts.length} 项`);
      } catch (error) {
        fail(m.id, "弹窗采集", error.message);
        records.push({ name: m.name, route: m.route, path: null, status: "failed", modal: true, error: error.message, viewport, id: m.id });
      }
    }
  } finally {
    await closeSession(session);
  }

  const successCount = records.filter((r) => r.status === "success").length;
  const failedCount = records.length - successCount;

  writeFileSync(
    resolve(actualsDir, "manifest.json"),
    JSON.stringify(
      {
        round: parseInt(round),
        timestamp: new Date().toISOString(),
        totalScreens: records.length,
        successCount,
        failedCount,
        screenshots: records,
      },
      null,
      2,
    ),
  );
  writeFileSync(resolve(root, "artifacts/visual-diff/dom-snapshot.json"), JSON.stringify(snapshot, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log(`📊 采集统计：${records.length} 目标，✅ ${successCount}，❌ ${failedCount}`);
  console.log(`   截图：${actualsDir}`);
  console.log(`   门用图：${gateActualDir}`);
  console.log(`   DOM 快照：artifacts/visual-diff/dom-snapshot.json`);
  console.log("=".repeat(60) + "\n");
  if (failedCount) process.exitCode = 1;
}

main().catch((e) => {
  console.error("❌ 采集趟次失败:", e);
  process.exit(1);
});
