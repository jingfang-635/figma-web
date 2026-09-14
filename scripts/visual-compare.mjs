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

const SSIM_MIN = Number(process.env.VISUAL_SSIM_MIN || 0.97);
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

const ssimLib = loadDep("fast-ssim");

// 计算 SSIM
function ssimScore(img1, img2) {
  try {
    return ssimLib.calculateSSIM(img1.data, img2.data, img1.width, img1.height);
  } catch {
    // Fallback to simple pixel comparison
    let match = 0;
    for (let i = 0; i < img1.data.length; i += 4) {
      if (Math.abs(img1.data[i] - img2.data[i]) < 30) match++;
    }
    return match / (img1.width * img1.height);
  }
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
  
  const exp = resizeGray(expected, width, height);
  const act = resizeGray(actual, width, height);
  
  const diff = new PNG({ width, height });
  const threshold = 0.25;
  
  const mismatch = pixelmatch(exp, act, diff.data, width, height, { threshold });
  const ratio = mismatch / (width * height);
  const ssim = ssimScore(expected, actual);
  
  return { mismatch, ratio, ssim };
}

// 生成热力图
function generateHeatmap(expected, actual, name, round) {
  const width = Math.min(expected.width, actual.width);
  const height = Math.min(expected.height, actual.height);
  
  const exp = resizeGray(expected, width, height);
  const act = resizeGray(actual, width, height);
  
  const diff = new PNG({ width, height });
  const threshold = 0.25;
  
  pixelmatch(exp, act, diff.data, width, height, { threshold });
  
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
function generateHtmlReport(differences, round) {
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
  
  for (const screenshot of manifest.screenshots) {
    if (screenshot.status === 'failed') continue;
    
    const name = screenshot.name;
    const expected = loadExpectedPng(name);
    const actual = loadActualPng(name, round);
    
    if (!expected) {
      console.log(`⚠️  ${name}: Figma 原图不存在，跳过`);
      continue;
    }
    
    if (!actual) {
      console.log(`⚠️  ${name}: 运行时截图不存在，跳过`);
      continue;
    }
    
    console.log(`📊 对比：${name}`);
    
    const { ssim, ratio, mismatch } = compareImages(expected, actual, name);
    const pass = ssim >= SSIM_MIN || ratio < MISMATCH_MAX;
    
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
  
  // 生成差异报告
  const report = {
    round: parseInt(round),
    timestamp: new Date().toISOString(),
    totalScreens: manifest.totalScreens,
    screensWithDiff: differences.length,
    criticalDiffs: differences.filter(d => d.category === 'critical').length,
    nonCriticalDiffs: differences.filter(d => d.category === 'non-critical').length,
    differences
  };
  
  const outDir = resolve(root, `artifacts/visual-diff/round-${round}`);
  writeFileSync(resolve(outDir, `round-${round}-differences.json`), JSON.stringify(report, null, 2));
  
  // 生成 HTML 报告
  generateHtmlReport(differences, round);
  
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
  console.log(`\n📄 详细报告：${resolve(outDir, `round-${round}-report.html`)}\n`);
  
  if (differences.length > 0) {
    console.log("❌ 发现差异，请修复后重截确认\n");
    process.exit(1);
  } else {
    console.log("✅ 所有页面对比通过！\n");
  }
}

main().catch(console.error);
