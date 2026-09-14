#!/usr/bin/env node
/**
 * 字段统计脚本：统计字段还原进度，生成轮次统计报告
 * 
 * 用法：
 *   node scripts/field-stats.mjs --round=1
 * 
 * 输出：artifacts/visual-diff/rounds.json, 终端统计报告
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

// 解析命令行参数
const args = process.argv.slice(2);
const roundArg = args.find(a => a.startsWith('--round='));
const round = roundArg ? roundArg.split('=')[1] : '1';

// 字段分类
const CRITICAL_FIELDS = ['columns', 'formFields', 'modalFields', 'stats', 'actions', 'title', 'subtitle', 'sections', 'formCard', 'cardTitle'];
const NON_CRITICAL_FIELDS = ['placeholder', 'hint', 'emptyText', 'footerText', 'helpText'];

// 加载 Figma 字段数据
function loadFigmaFields() {
  const fieldsPath = resolve(root, "fixtures/figma-fields.json");
  if (!existsSync(fieldsPath)) {
    console.error("❌ figma-fields.json 不存在，请先运行字段提取脚本");
    process.exit(1);
  }
  return JSON.parse(readFileSync(fieldsPath, "utf-8"));
}

// 加载 screenConfigs
function loadScreenConfigs() {
  const configPath = resolve(root, "apps/web/src/generated/screenConfigs.ts");
  if (!existsSync(configPath)) {
    console.error("❌ screenConfigs.ts 不存在，请先运行 npm run visual:gen");
    process.exit(1);
  }
  return readFileSync(configPath, "utf-8");
}

// 提取字段
function extractFieldsFromConfig(content) {
  const fields = {};
  
  // 提取 columns
  const columnsRegex = /columns:\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = columnsRegex.exec(content)) !== null) {
    const columnMatches = match[1].matchAll(/title:\s*['"]([^'"]+)['"]/g);
    for (const m of columnMatches) {
      if (!fields.columns) fields.columns = [];
      fields.columns.push(m[1]);
    }
  }
  
  // 提取 formFields
  const formFieldsRegex = /formFields:\s*\[([\s\S]*?)\]/g;
  while ((match = formFieldsRegex.exec(content)) !== null) {
    const fieldMatches = match[1].matchAll(/label:\s*['"]([^'"]+)['"]/g);
    for (const m of fieldMatches) {
      if (!fields.formFields) fields.formFields = [];
      fields.formFields.push(m[1]);
    }
  }
  
  // 提取 stats
  const statsRegex = /stats:\s*\[([\s\S]*?)\]/g;
  while ((match = statsRegex.exec(content)) !== null) {
    const statMatches = match[1].matchAll(/title:\s*['"]([^'"]+)['"]/g);
    for (const m of statMatches) {
      if (!fields.stats) fields.stats = [];
      fields.stats.push(m[1]);
    }
  }
  
  return fields;
}

// 计算 Levenshtein 距离
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 比较字段
function compareFields(expected, actual, fieldType) {
  if (CRITICAL_FIELDS.includes(fieldType)) {
    // 关键字段：必须 100% 匹配
    return expected === actual ? 0 : 1;
  } else {
    // 非关键字段：允许 5% 差异
    const diffRatio = levenshteinDistance(expected, actual) / expected.length;
    return diffRatio > 0.05 ? 1 : 0;
  }
}

// 加载轮次状态
function loadRoundsState() {
  const roundsPath = resolve(root, "artifacts/visual-diff/rounds.json");
  if (!existsSync(roundsPath)) {
    return { currentRound: 0, history: [], finalStatus: { completed: false } };
  }
  return JSON.parse(readFileSync(roundsPath, "utf-8"));
}

// 保存轮次状态
function saveRoundsState(state) {
  const roundsPath = resolve(root, "artifacts/visual-diff/rounds.json");
  mkdirSync(resolve(root, "artifacts/visual-diff"), { recursive: true });
  writeFileSync(roundsPath, JSON.stringify(state, null, 2));
}

async function main() {
  console.log(`📊 开始第 ${round} 轮字段统计...\n`);
  
  // 加载数据
  const figmaFields = loadFigmaFields();
  const screenConfigs = loadScreenConfigs();
  const generatedFields = extractFieldsFromConfig(screenConfigs);
  
  // 统计字段
  const statistics = {
    totalFields: 0,
    criticalFields: 0,
    criticalAligned: 0,
    nonCriticalFields: 0,
    nonCriticalAligned: 0,
    fieldDiffs: [],
    fixedThisRound: 0,
    cumulativeFixed: 0,
    remaining: 0
  };
  
  // 比较字段
  for (const [fieldType, expectedFields] of Object.entries(figmaFields)) {
    const isCritical = CRITICAL_FIELDS.includes(fieldType);
    const actualFields = generatedFields[fieldType] || [];
    
    statistics.totalFields += expectedFields.length;
    
    if (isCritical) {
      statistics.criticalFields += expectedFields.length;
    } else {
      statistics.nonCriticalFields += expectedFields.length;
    }
    
    for (const expected of expectedFields) {
      const actual = actualFields.find(f => f === expected);
      const diff = compareFields(expected, actual || '', fieldType);
      
      if (diff === 0) {
        // 字段对齐
        if (isCritical) {
          statistics.criticalAligned++;
        } else {
          statistics.nonCriticalAligned++;
        }
      } else {
        // 字段有差异
        statistics.fieldDiffs.push({
          fieldType,
          expected,
          actual: actual || '(缺失)',
          category: isCritical ? 'critical' : 'non-critical'
        });
      }
    }
  }
  
  // 计算对齐率
  const criticalAlignedRate = statistics.criticalFields > 0 
    ? (statistics.criticalAligned / statistics.criticalFields * 100).toFixed(1)
    : 100;
  
  const nonCriticalAlignedRate = statistics.nonCriticalFields > 0
    ? (statistics.nonCriticalAligned / statistics.nonCriticalFields * 100).toFixed(1)
    : 100;
  
  const totalAlignedRate = statistics.totalFields > 0
    ? ((statistics.criticalAligned + statistics.nonCriticalAligned) / statistics.totalFields * 100).toFixed(1)
    : 100;
  
  // 加载历史轮次数据
  const roundsState = loadRoundsState();
  const previousRound = roundsState.history[roundsState.history.length - 1];
  
  if (previousRound) {
    statistics.fixedThisRound = previousRound.remaining - statistics.fieldDiffs.length;
    statistics.cumulativeFixed = previousRound.fixed + statistics.fixedThisRound;
  } else {
    statistics.fixedThisRound = 0;
    statistics.cumulativeFixed = statistics.totalFields - statistics.fieldDiffs.length;
  }
  
  statistics.remaining = statistics.fieldDiffs.length;
  
  // 生成统计报告
  console.log("📊 字段还原统计报告");
  console.log("=".repeat(60));
  console.log(`总字段数：${statistics.totalFields} 个`);
  console.log(`已修复字段：${statistics.cumulativeFixed} 个 (${totalAlignedRate}%)`);
  console.log(`剩余差异：${statistics.remaining} 个`);
  console.log("");
  console.log(`🔴 关键字段:`);
  console.log(`   总数：${statistics.criticalFields} 个`);
  console.log(`   已对齐：${statistics.criticalAligned} 个 (${criticalAlignedRate}%)`);
  console.log(`   剩余差异：${statistics.criticalFields - statistics.criticalAligned} 个`);
  console.log("");
  console.log(`🟡 非关键字段:`);
  console.log(`   总数：${statistics.nonCriticalFields} 个`);
  console.log(`   已对齐：${statistics.nonCriticalAligned} 个 (${nonCriticalAlignedRate}%)`);
  console.log(`   剩余差异：${statistics.nonCriticalFields - statistics.nonCriticalAligned} 个`);
  console.log("");
  console.log(`📈 本轮修复：${statistics.fixedThisRound} 个`);
  console.log(`📈 累计修复：${statistics.cumulativeFixed} 个`);
  console.log("=".repeat(60));
  
  // 输出剩余差异详情
  if (statistics.fieldDiffs.length > 0) {
    console.log("\n🔍 剩余差异详情:");
    
    const criticalDiffs = statistics.fieldDiffs.filter(d => d.category === 'critical');
    const nonCriticalDiffs = statistics.fieldDiffs.filter(d => d.category === 'non-critical');
    
    if (criticalDiffs.length > 0) {
      console.log("\n   🔴 关键字段差异:");
      criticalDiffs.forEach(d => {
        console.log(`   - ${d.fieldType}: "${d.expected}" vs "${d.actual}"`);
      });
    }
    
    if (nonCriticalDiffs.length > 0) {
      console.log("\n   🟡 非关键字段差异 (允许 5% 差异):");
      nonCriticalDiffs.slice(0, 10).forEach(d => {
        console.log(`   - ${d.fieldType}: "${d.expected}" vs "${d.actual}"`);
      });
      if (nonCriticalDiffs.length > 10) {
        console.log(`   ... 还有 ${nonCriticalDiffs.length - 10} 个非关键字段差异`);
      }
    }
  }
  
  console.log("");
  
  // 更新轮次状态
  roundsState.currentRound = parseInt(round);
  roundsState.history.push({
    round: parseInt(round),
    timestamp: new Date().toISOString(),
    totalFields: statistics.totalFields,
    totalDiffs: statistics.fieldDiffs.length,
    fixed: statistics.cumulativeFixed,
    remaining: statistics.remaining,
    criticalRemaining: statistics.criticalFields - statistics.criticalAligned,
    nonCriticalRemaining: statistics.nonCriticalFields - statistics.nonCriticalAligned,
    criticalAlignedRate: parseFloat(criticalAlignedRate),
    nonCriticalAlignedRate: parseFloat(nonCriticalAlignedRate),
    fixedThisRound: statistics.fixedThisRound
  });
  
  // 检查是否通过
  const passed = statistics.criticalFields - statistics.criticalAligned === 0 &&
                 parseFloat(nonCriticalAlignedRate) >= 95;
  
  if (passed) {
    roundsState.finalStatus = {
      totalRounds: parseInt(round),
      criticalFieldsAligned: 100,
      nonCriticalFieldsAligned: parseFloat(nonCriticalAlignedRate),
      visualScreensPassed: 100,
      completed: true
    };
    console.log("✅ 字段还原通过！关键字段 100% 对齐，非关键字段 ≥ 95%");
  } else {
    console.log("❌ 字段还原未通过，请修复剩余差异");
    
    if (statistics.criticalFields - statistics.criticalAligned > 0) {
      console.log("   原因：还有关键字段未对齐");
    }
    if (parseFloat(nonCriticalAlignedRate) < 95) {
      console.log("   原因：非关键字段对齐率 < 95%");
    }
  }
  
  // 保存轮次状态
  saveRoundsState(roundsState);
  console.log(`\n📄 轮次状态已保存：artifacts/visual-diff/rounds.json`);
  
  // 询问是否进入下一轮
  console.log("\n" + "=".repeat(60));
  console.log("❓ 是否进入下一轮还原？");
  console.log("   进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮");
  console.log("   不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
