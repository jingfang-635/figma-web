#!/usr/bin/env node
// 裁剪参考图右上角工具栏区域并采样按钮填充色
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const file = process.argv[2] || 'imports/figma/screens/排班管理.png';
const png = PNG.sync.read(readFileSync(file));
const { width, height, data } = png;
console.log(`image: ${width}x${height}`);

// 取右上角区域（x: 60%-100%, y: 8%-16%）——工具栏按钮所在
const x0 = Math.floor(width * 0.6), x1 = width;
const y0 = Math.floor(height * 0.08), y1 = Math.floor(height * 0.18);
const counts = new Map();
for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 30) continue;
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`region x:${x0}-${x1} y:${y0}-${y1} top colors:`);
for (const [k, c] of top) {
  const hex = '#' + k.split(',').map((v) => Number(v).toString(16).padStart(2, '0')).join('');
  console.log(`  ${hex}  (${k})  x${c}`);
}

// 另存裁剪图供人工查看
const crop = new PNG({ width: x1 - x0, height: y1 - y0 });
for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const si = (y * width + x) * 4;
    const di = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
    for (let k = 0; k < 4; k++) crop.data[di + k] = data[si + k];
  }
}
writeFileSync('artifacts/visual-diff/_toolbar-crop.png', PNG.sync.write(crop));
console.log('crop saved: artifacts/visual-diff/_toolbar-crop.png');