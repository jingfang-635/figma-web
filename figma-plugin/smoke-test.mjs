// 插件逻辑冒烟测试：模拟 Figma 沙箱（无 window、无模块），验证
// 1) SVG_DATA 内联加载  2) emoji 匹配（含 VS16 归一化）
// 3) SVG 字符串生成  4) 替换流程跑通并 closePlugin
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(root, 'code.js'), 'utf8');

const calls = [];
const fakeVector = { type: 'VECTOR', fills: [], strokes: [], strokeWeight: 1 };
const fakeIcon = {
  name: '',
  x: 0,
  y: 0,
  width: 17,
  height: 17,
  findAll: () => [fakeVector],
};
let svgCount = 0;

const figma = {
  createNodeFromSvg(svg) {
    svgCount++;
    if (!svg.includes('<svg') || !svg.includes('xmlns')) throw new Error('bad svg: ' + svg.slice(0, 80));
    fakeIcon.name = '';
    return fakeIcon;
  },
  loadFontAsync: async () => {},
  notify: (m) => calls.push(['notify', m]),
  closePlugin: () => calls.push(['close']),
  currentPage: { selection: [], children: [] },
};

// 纯图标图层（侧边栏 🏠）+ 混合图层（📈 近7天预约量趋势）
const mixed = {
  type: 'TEXT',
  characters: '📈 近7天预约量趋势',
  height: 20,
  x: 264,
  y: 275,
  fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.15 } }],
  getRangeAllFonts: () => [],
};
const pure = {
  type: 'TEXT',
  characters: '🏠',
  height: 24,
  x: 27,
  y: 83,
  fills: [{ type: 'SOLID', color: { r: 0.09, g: 0.56, b: 1 } }],
  getRangeAllFonts: () => [],
  remove() {
    this.removed = true;
    this.parent = null;
  },
};
const parent = { children: [pure, mixed], insertChild: (i, n) => calls.push(['insert', n.name, i]) };
pure.parent = parent;
mixed.parent = parent;

// 无选区 → main() 遍历 currentPage.children；把测试节点挂进去
figma.currentPage.children = [pure, mixed];

const ctx = vm.createContext({ figma, console });
vm.runInContext(src, ctx);

// 等待 main() 异步完成
await new Promise((r) => setTimeout(r, 300));

const notifyCall = calls.find(([k]) => k === 'notify');
const closeCall = calls.find(([k]) => k === 'close');
const inserts = calls.filter(([k]) => k === 'insert');

console.log('svg strings generated:', svgCount);
console.log('inserted icons:', inserts.map(([, n]) => n).join(', '));
console.log('notify:', notifyCall ? notifyCall[1] : '(none)');
console.log('closePlugin called:', Boolean(closeCall));
console.log('mixed text now:', JSON.stringify(mixed.characters));
console.log('pure removed:', pure.parent === null);

if (svgCount === 2 && closeCall && inserts.length === 2) {
  console.log('SMOKE TEST PASS');
} else {
  console.log('SMOKE TEST FAIL');
  process.exit(1);
}