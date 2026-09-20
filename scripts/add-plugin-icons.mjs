#!/usr/bin/env node
/**
 * 一次性脚本：从 @ant-design/icons-svg 提取图标 JSON，追加到 figma-plugin/svgs.js。
 * 幂等：已存在的条目自动跳过。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const names = [
  'DownloadOutlined',
  'KeyOutlined',
  'CloudUploadOutlined',
  'WifiOutlined',
  'HeartOutlined',
  'WarningOutlined',
  'ScissorOutlined',
  'LinkOutlined',
  'CheckSquareOutlined',
  'MenuOutlined',
  'VideoCameraOutlined',
  'UndoOutlined',
  'RedoOutlined',
  'ExpandOutlined',
  'SearchOutlined',
  'StarFilled',
  'LikeOutlined',
  // 第三轮（2026-09-20 重扫残留）：患者管理 🔖/🔓、预约规则 💾
  'TagOutlined',
  'UnlockOutlined',
  'SaveOutlined',
];

const svgsPath = resolve(root, 'figma-plugin/svgs.js');
let cur = readFileSync(svgsPath, 'utf8');

const entries = [];
let skipped = 0;
for (const n of names) {
  if (cur.includes(`"${n}":`)) {
    skipped++;
    continue;
  }
  const src = readFileSync(
    resolve(root, 'apps/web/node_modules/@ant-design/icons-svg/es/asn/' + n + '.js'),
    'utf8',
  );
  const m = src.match(/= (\{.*?\})\s*;\s*(?:export|$)/s);
  if (!m) {
    console.error('PARSE FAIL', n);
    process.exit(1);
  }
  entries.push(`  "${n}": ${m[1].trim()}`);
}

if (entries.length) {
  const lastIdx = cur.lastIndexOf('};');
  if (lastIdx < 0) {
    console.error('no closing brace found');
    process.exit(1);
  }
  const insert = entries.join(',\n') + ',\n';
  cur = cur.slice(0, lastIdx) + insert + cur.slice(lastIdx);
  writeFileSync(svgsPath, cur, 'utf8');
}
console.log(`added ${entries.length}, skipped(existing) ${skipped}`);