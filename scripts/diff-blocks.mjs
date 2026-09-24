import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

// 逐块对比 actual 与 expected，输出差异最大的区域坐标
function diffRegions(name) {
  const a = PNG.sync.read(readFileSync(`artifacts/visual-diff/${name}.actual.png`));
  const e = PNG.sync.read(readFileSync(`artifacts/visual-diff/${name}.expected.png`));
  const W = Math.min(a.width, e.width), H = Math.min(a.height, e.height);
  const cell = 32;
  const rows = Math.ceil(H / cell), cols = Math.ceil(W / cell);
  const hot = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let diff = 0;
      for (let y = by * cell; y < Math.min((by + 1) * cell, H); y++) {
        for (let x = bx * cell; x < Math.min((bx + 1) * cell, W); x++) {
          const i = (y * a.width + x) * 4;
          const j = (y * e.width + x) * 4;
          if (Math.abs(a.data[i] - e.data[j]) > 24 || Math.abs(a.data[i+1] - e.data[j+1]) > 24 || Math.abs(a.data[i+2] - e.data[j+2]) > 24) diff++;
        }
      }
      if (diff > cell * cell * 0.08) hot.push({ x: bx * cell, y: by * cell, diff });
    }
  }
  console.log(`\n${name}: ${hot.length} hot blocks`);
  // 聚类输出前 10 个
  hot.sort((p, q) => q.diff - p.diff);
  for (const h of hot.slice(0, 10)) console.log(`  (${h.x},${h.y}) diff=${h.diff}`);
  return hot.length;
}

diffRegions('modal-create-schedule');
diffRegions('modal-batch-schedule');