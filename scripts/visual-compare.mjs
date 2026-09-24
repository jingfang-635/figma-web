#!/usr/bin/env node
/**
 * 批量对比脚本：对比 Figma 原图 vs 运行时截图，生成热力图和差异报告
 * 
 * 用法：
 *   node scripts/visual-compare.mjs --round=1
 *   node scripts/visual-compare.mjs --round=2 --verify-only
 * 
 * 输出：artifacts/visual-diff/round-N/diff/*.png, round-N-differences.json
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");

// 解析命令行参数
const args = process.argv.slice(2);
const roundArg = args.find(a => a.startsWith('--round='));
const verifyOnly = args.includes('--verify-only');

const round = roundArg ? roundArg.split('=')[1] : '1';

// 阈值与 visual-gate.mjs 一致：SSIM（ssim.js）作结构崩塌检测，mismatch 作像素保真
const SSIM_MIN = Number(process.env.VISUAL_SSIM_MIN || 0.55);
const MISMATCH_MAX = Number(process.env.VISUAL_MISMATCH_MAX || 0.02);

// 字段分类
const CRITICAL_FIELDS = ['columns', 'formFields', 'modalFields', 'stats', 'actions', 'title', 'subtitle', 'sections', 'formCard'];
const NON_CRITICAL_FIELDS = ['placeholder', 'hint', 'emptyText', 'footerText', 'helpText'];

function loadDep(name) {
  try {
    return require(name);
  } catch {
    console.error(`Missing ${name}. Run: npm install -D playwright pixelmatch pngjs`);
    process.exit(1);
  }
}

// SSIM 引擎：ssim.js（与 visual-gate.mjs 同实现，标准 MSSIM windowSize=11）
function ssimScore(a, b) {
  const { ssim } = require("ssim.js");
  const { mssim } = ssim(
    { data: a.data, width: a.width, height: a.height },
    { data: b.data, width: b.width, height: b.height },
    { windowSize: 11 },
  );
  return mssim;
}

// 加载截图清单
function loadManifest(round) {
  const manifestPath = resolve(root, `artifacts/visual-diff/round-${round}/actuals/manifest.json`);
  if (!existsSync(manifestPath)) {
    console.error(`❌ Round ${round} manifest not found. Run capture-screens first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}

// 加载 Figma 原图
function loadExpectedPng(name) {
  const shotPath = resolve(root, `imports/figma/screens/${name}.png`);
  if (!existsSync(shotPath)) {
    return null;
  }
  return PNG.sync.read(readFileSync(shotPath));
}

// 加载运行时截图
function loadActualPng(name, round) {
  const actualPath = resolve(root, `artifacts/visual-diff/round-${round}/actuals/${name}.png`);
  if (!existsSync(actualPath)) {
    return null;
  }
  return PNG.sync.read(readFileSync(actualPath));
}

// 填充矩形区域（用于 mask）
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

// 调整大小并转灰度
function resizeGray(png, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x / w) * png.width));
      const sy = Math.min(png.height - 1, Math.floor((y / h) * png.height));
      const i = (sy * png.width + sx) * 4;
      out[y * w + x] = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
    }
  }
  return out;
}

// 对比单张图片
function compareImages(expected, actual, name) {
  const width = Math.min(expected.width, actual.width);
  const height = Math.min(expected.height, actual.height);

  // 尺寸不同时裁剪到同几何（左上对齐）
  const crop = (png, w, h) => {
    if (png.width === w && png.height === h) return png;
    const o = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * png.width + x) * 4;
        const di = (y * w + x) * 4;
        for (let k = 0; k < 4; k++) o.data[di + k] = png.data[si + k];
      }
    }
    return o;
  };
  const e = crop(expected, width, height);
  const a = crop(actual, width, height);

  const diff = new PNG({ width, height });
  const threshold = 0.25;
  const mismatch = pixelmatch(e.data, a.data, diff.data, width, height, { threshold });
  const ratio = mismatch / (width * height);
  const ssim = ssimScore(e, a);

  return { mismatch, ratio, ssim, diff };
}

// 生成热力图
function cropTo(png, w, h) {
  if (png.width === w && png.height === h) return png;
  const o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * png.width + x) * 4;
      const di = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) o.data[di + k] = png.data[si + k];
    }
  }
  return o;
}

function generateHeatmap(expected, actual, name, round) {
  const width = Math.min(expected.width, actual.width);
  const height = Math.min(expected.height, actual.height);

  const e = cropTo(expected, width, height);
  const a = cropTo(actual, width, height);

  const diff = new PNG({ width, height });
  const threshold = 0.25;

  pixelmatch(e.data, a.data, diff.data, width, height, { threshold });
  
  // 用亮红色标注差异区域
  for (let i = 0; i < diff.data.length; i += 4) {
    if (diff.data[i + 3] > 0) { // 有差异的像素
      diff.data[i] = 255;     // R
      diff.data[i + 1] = 0;   // G
      diff.data[i + 2] = 0;   // B
      diff.data[i + 3] = 179; // A (70% 不透明)
    }
  }
  
  const outDir = resolve(root, `artifacts/visual-diff/round-${round}/diff`);
  mkdirSync(outDir, { recursive: true });
  
  writeFileSync(resolve(outDir, `${name}.diff.png`), PNG.sync.write(diff));
}

// 生成 HTML 报告
function generateHtmlReport(differences, round, screenResults = [], skippedScreens = []) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视觉还原轮次 ${round} - 差异报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    .header { background: #f0f2f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .stat { display: inline-block; margin-right: 20px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1890ff; }
    .stat-label { font-size: 14px; color: #666; }
    .critical { color: #f5222d; }
    .success { color: #52c41a; }
    .warning { color: #faad14; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e8e8e8; }
    th { background: #fafafa; font-weight: 600; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status-pending { background: #fff7e6; color: #fa8c16; }
    .status-fixed { background: #f6ffed; color: #52c41a; }
    .status-verified { background: #e6f7ff; color: #1890ff; }
    img { max-width: 400px; border: 1px solid #d9d9d9; border-radius: 4px; }
    .banner-success { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 15px; }
    h2 { font-size: 16px; margin: 24px 0 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 视觉还原轮次 ${round} - 差异报告</h1>
    <div>
      <span class="stat">
        <div class="stat-value">${differences.length}</div>
        <div class="stat-label">总差异数</div>
      </span>
      <span class="stat">
        <div class="stat-value ${differences.filter(d => d.category === 'critical').length === 0 ? 'success' : 'critical'}">
          ${differences.filter(d => d.category === 'critical').length}
        </div>
        <div class="stat-label">关键字段差异</div>
      </span>
      <span class="stat">
        <div class="stat-value warning">${differences.filter(d => d.category === 'non-critical').length}</div>
        <div class="stat-label">非关键字段差异</div>
      </span>
    </div>
  </div>
  ${differences.length === 0 ? `
  <div class="banner-success">
    ✅ 全部 ${screenResults.length} 个页面对比通过（SSIM ≥ ${SSIM_MIN} 或 mismatch < ${(MISMATCH_MAX * 100).toFixed(0)}%），未发现视觉差异。
  </div>` : ''}
  
  <h2>逐屏对比结果</h2>
  <table>
    <thead>
      <tr>
        <th>页面</th>
        <th>路由</th>
        <th>SSIM</th>
        <th>Mismatch</th>
        <th>结果</th>
        <th>热力图</th>
      </tr>
    </thead>
    <tbody>
      ${screenResults.map(r => `
        <tr>
          <td>${r.screen}</td>
          <td>${r.route}</td>
          <td>${r.ssim != null ? r.ssim.toFixed(3) : '-'}</td>
          <td>${r.mismatch != null ? (r.mismatch * 100).toFixed(1) + '%' : '-'}</td>
          <td>
            ${r.ssim != null
              ? (r.pass
                ? '<span class="status status-fixed">✅ 通过</span>'
                : `<span class="status status-pending">🔴 未达标</span>`)
              : '<span class="status status-verified">⚠️ 已跳过</span>'}
          </td>
          <td>${r.ssim != null && !r.pass ? `<a href="diff/${r.screen}.diff.png" target="_blank">查看热力图</a>` : '-'}</td>
        </tr>
      `).join('')}
      ${skippedScreens.map(s => `
        <tr>
          <td>${s.name}</td>
          <td>${s.route || '-'}</td>
          <td>-</td>
          <td>-</td>
          <td><span class="status status-verified">⚠️ 已跳过</span></td>
          <td>-</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${differences.length > 0 ? `
  <h2>差异明细</h2>
  <table>
    <thead>
      <tr>
        <th>页面</th>
        <th>类型</th>
        <th>字段/区域</th>
        <th>期望值</th>
        <th>实际值</th>
        <th>分类</th>
        <th>状态</th>
        <th>热力图</th>
      </tr>
    </thead>
    <tbody>
      ${differences.map(d => `
        <tr>
          <td>${d.screen}</td>
          <td>${d.type}</td>
          <td>${d.field || d.region}</td>
          <td>${d.expected}</td>
          <td>${d.actual}</td>
          <td>
            <span class="status ${d.category === 'critical' ? 'status-pending critical' : 'status-pending warning'}">
              ${d.category === 'critical' ? '🔴 关键字段' : '🟡 非关键字段'}
            </span>
          </td>
          <td><span class="status status-pending">${d.status}</span></td>
          <td><a href="diff/${d.screen}.diff.png" target="_blank">查看热力图</a></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}
</body>
</html>
  `;
  
  const outDir = resolve(root, `artifacts/visual-diff/round-${round}`);
  writeFileSync(resolve(outDir, `round-${round}-report.html`), html);
}

// 生成终端 ASCII 热力图
function generateAsciiHeatmap(differences) {
  console.log("\n🔥 差异热力图:");
  console.log("┌" + "─".repeat(58) + "┐");
  
  const regions = {};
  differences.forEach(d => {
    const key = d.screen;
    if (!regions[key]) regions[key] = [];
    regions[key].push(d);
  });
  
  for (const [screen, diffs] of Object.entries(regions)) {
    const criticalCount = diffs.filter(d => d.category === 'critical').length;
    const nonCriticalCount = diffs.filter(d => d.category === 'non-critical').length;
    const total = diffs.length;
    const barLength = Math.min(10, Math.ceil(total / 3));
    const filled = Math.floor((total / 15) * 10);
    
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    const pct = Math.round((total / 15) * 100);
    
    console.log(`│ ${screen.padEnd(12)} [${bar}] 差异 ${pct}%`.padEnd(59) + "│");
  }
  
  console.log("└" + "─".repeat(58) + "┘");
}

async function main() {
  console.log(`🔍 开始第 ${round} 轮批量对比...\n`);
  
  const manifest = loadManifest(round);
  const differences = [];
  const screenResults = [];
  const skippedScreens = [];

  for (const screenshot of manifest.screenshots) {
    if (screenshot.status === 'failed') {
      skippedScreens.push({ name: screenshot.name, route: screenshot.route, reason: '截图失败' });
      continue;
    }

    const name = screenshot.name;
    const expected = loadExpectedPng(name);
    const actual = loadActualPng(name, round);

    if (!expected) {
      console.log(`⚠️  ${name}: Figma 原图不存在，跳过`);
      skippedScreens.push({ name, route: screenshot.route, reason: 'Figma 原图不存在' });
      continue;
    }

    if (!actual) {
      console.log(`⚠️  ${name}: 运行时截图不存在，跳过`);
      skippedScreens.push({ name, route: screenshot.route, reason: '运行时截图不存在' });
      continue;
    }

    console.log(`📊 对比：${name}`);

    const { ssim, ratio, mismatch } = compareImages(expected, actual, name);
    const pass = ssim >= SSIM_MIN || ratio < MISMATCH_MAX;
    screenResults.push({ screen: name, route: screenshot.route, ssim, mismatch: ratio, pass });
    console.log(`   SSIM: ${ssim.toFixed(3)} (${pass ? '✅' : '🔴'})`);
    console.log(`   Mismatch: ${(ratio * 100).toFixed(1)}%`);
    
    if (!pass) {
      // 生成热力图
      generateHeatmap(expected, actual, name, round);
      
      // 添加差异记录
      differences.push({
        screen: name,
        type: 'visual',
        category: ssim < 0.9 ? 'critical' : 'non-critical',
        region: '整体页面',
        expected: `SSIM ≥ ${SSIM_MIN}`,
        actual: `SSIM ${ssim.toFixed(3)}`,
        ssim,
        mismatch: ratio,
        status: 'pending',
        file: `artifacts/visual-diff/round-${round}/diff/${name}.diff.png`
      });
    }
  }
  
  // 差异自动修复规则匹配：known=已知模式带修法提示；manual=待人工
  const { summarizeFixes } = await import("./lib/fix-rules.mjs");
  let themeHasCellPadding = false;
  let themeHasModalToken = false;
  try {
    const themeSrc = readFileSync(resolve(root, "apps/web/src/theme/antdTheme.ts"), "utf-8");
    themeHasCellPadding = /cellPaddingBlock/.test(themeSrc);
    themeHasModalToken = /titleFontSize/.test(themeSrc);
  } catch {
    // 主题文件缺失时按 false 处理（规则兜底生效）
  }
  const fixSummary = summarizeFixes(differences, { themeHasCellPadding, themeHasModalToken });

  const report = {
    round: parseInt(round),
    timestamp: new Date().toISOString(),
    totalScreens: manifest.totalScreens,
    screensWithDiff: differences.length,
    criticalDiffs: differences.filter(d => d.category === 'critical').length,
    nonCriticalDiffs: differences.filter(d => d.category === 'non-critical').length,
    knownFixes: fixSummary.known,
    manualFixes: fixSummary.manual,
    screenResults,
    skippedScreens,
    differences
  };

  const outDir = resolve(root, `artifacts/visual-diff/round-${round}`);
  writeFileSync(resolve(outDir, `round-${round}-differences.json`), JSON.stringify(report, null, 2));

  // 生成 HTML 报告
  generateHtmlReport(differences, round, screenResults, skippedScreens);

  // 生成终端 ASCII 热力图
  generateAsciiHeatmap(differences);

  console.log("\n" + "=".repeat(60));
  console.log("📊 对比统计:");
  console.log(`   总页面数：${manifest.totalScreens}`);
  console.log(`   有差异：${differences.length}`);
  console.log(`   🔴 关键字段：${report.criticalDiffs}`);
  console.log(`   🟡 非关键字段：${report.nonCriticalDiffs}`);
  console.log(`   ✅ 通过：${manifest.totalScreens - differences.length}`);
  console.log("=".repeat(60));

  // 自动修复规则命中情况：已知模式给出修法提示，未识别的升级人工
  if (fixSummary.known.length) {
    console.log(`\n🔧 已知差异模式（${fixSummary.known.length} 项，可按提示直接修）：`);
    const byRule = new Map();
    for (const k of fixSummary.known) {
      if (!byRule.has(k.ruleId)) byRule.set(k.ruleId, []);
      byRule.get(k.ruleId).push(k);
    }
    for (const [ruleId, items] of byRule) {
      console.log(`   [${ruleId}] ${items[0].ruleDesc}`);
      console.log(`      → ${items[0].fixHint}`);
      console.log(`      涉及屏：${[...new Set(items.map(i => i.screen))].join(', ')}`);
    }
  }
  if (fixSummary.manual.length) {
    console.log(`\n👤 待人工判断的差异：${fixSummary.manual.length} 项（看热力图定位）`);
  }

  console.log(`\n📄 详细报告：${resolve(outDir, `round-${round}-report.html`)}\n`);

  if (differences.length > 0) {
    console.log("❌ 发现差异，请修复后重截确认\n");
    process.exitCode = 1; // 不用 process.exit()：避免 Windows + Playwright 的 libuv 崩溃
  } else {
    console.log("✅ 所有页面对比通过！\n");
  }
}

main().catch(console.error);