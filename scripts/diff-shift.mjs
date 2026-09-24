import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

// 行级差异剖面：找差异行位置；再做 ±6px 垂直互相关判断是否整体位移
function analyze(name) {
  const a = PNG.sync.read(readFileSync(`artifacts/visual-diff/${name}.actual.png`));
  const e = PNG.sync.read(readFileSync(`artifacts/visual-diff/${name}.expected.png`));
  const W = Math.min(a.width, e.width), H = Math.min(a.height, e.height);
  const gray = (d, x, y) => { const i = (y * d.width + x) * 4; return 0.299*d.data[i]+0.587*d.data[i+1]+0.114*d.data[i+2]; };

  // 行差异剖面
  const rowDiff = [];
  for (let y = 0; y < H; y++) {
    let n = 0;
    for (let x = 0; x < W; x += 2) {
      if (Math.abs(gray(a, x, y) - gray(e, x, y)) > 30) n++;
    }
    rowDiff.push(n);
  }
  // 差异行聚合为区段
  const bands = [];
  let s = -1;
  for (let y = 0; y < H; y++) {
    const hot = rowDiff[y] > W * 0.02;
    if (hot && s < 0) s = y;
    if (!hot && s >= 0) { bands.push([s, y - 1]); s = -1; }
  }
  if (s >= 0) bands.push([s, H - 1]);
  console.log(`\n${name} (${W}x${H}) diff bands:`, bands.map(b => `${b[0]}-${b[1]}`).join(', '));

  // 垂直位移检测：对差异带，把 actual 带向上/下平移找最佳匹配
  for (const [b0, b1] of bands.slice(0, 4)) {
    let best = { shift: 0, score: Infinity };
    for (let sh = -6; sh <= 6; sh++) {
      let score = 0, cnt = 0;
      for (let y = b0; y <= b1; y++) {
        const yy = y + sh;
        if (yy < 0 || yy >= H) continue;
        for (let x = 0; x < W; x += 2) {
          score += Math.abs(gray(a, x, yy) - gray(e, x, y)); cnt++;
        }
      }
      score /= cnt || 1;
      if (score < best.score) best = { shift: sh, score };
    }
    console.log(`  band ${b0}-${b1}: best vertical shift = ${best.shift}px (residual ${best.score.toFixed(1)}) ${best.score < 8 ? '-> 位移造成' : '-> 内容不同'}`);
  }
}

analyze('modal-create-schedule');
analyze('modal-batch-schedule');