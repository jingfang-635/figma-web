// Charts 命令冒烟测试：模拟 Figma 沙箱，验证
// 1) svg-icon(538×180) 识别与标题匹配  2) 组件集 Chart(Type=Trend/DeptBars/Income) 生成
// 3) 原位替换为 Instance 并删除旧节点  4) 幂等：二次运行提示无图表且不重复建组件
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(root, 'code.js'), 'utf8');

const calls = [];
const instances = [];

function makeNode(type, name, x = 0, y = 0, w = 100, h = 100) {
  const n = {
    type, name, x, y, width: w, height: h,
    children: [], fills: [], strokes: [], effects: [], cornerRadius: 0,
    parent: null,
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    insertChild(i, c) { c.parent = n; n.children.splice(Math.max(0, Math.min(i, n.children.length)), 0, c); return c; },
    remove() {
      if (n.parent) {
        const i = n.parent.children.indexOf(n);
        if (i >= 0) n.parent.children.splice(i, 1);
        n.parent = null;
      }
    },
    findAll(pred, out = []) {
      if (pred(n)) out.push(n);
      for (const c of n.children) c.findAll(pred, out);
      return out;
    },
    findOne(pred) {
      if (pred(n)) return n;
      for (const c of n.children) {
        const f = c.findOne(pred);
        if (f) return f;
      }
      return null;
    },
    resize(w2, h2) { n.width = w2; n.height = h2; },
  };
  return n;
}

function makeText() {
  const t = makeNode('TEXT', 'text', 0, 0, 0, 16);
  t.characters = '';
  t.fontSize = 12;
  t.fontName = { family: 'Inter', style: 'Regular' };
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  t.textAlignHorizontal = 'LEFT';
  t.textAlignVertical = 'TOP';
  return t;
}

function makeChartGroup(parent, opts) {
  const card = makeNode('RECTANGLE', 'box', opts.x, opts.y, 578, 259);
  parent.appendChild(card);
  const title = makeText();
  title.characters = opts.title;
  title.fontSize = 14;
  title.x = opts.x + 20;
  title.y = opts.y + 20;
  title.width = 124; title.height = 20;
  parent.appendChild(title);
  if (opts.icon) {
    const ic = makeNode('FRAME', opts.icon, opts.x + 20, opts.y + 21, 14, 14);
    parent.appendChild(ic);
  }
  const svg = makeNode('FRAME', 'svg-icon', opts.x + 20, opts.y + 55, 538, 180);
  parent.appendChild(svg);
  return { card, title, svg };
}

let svgCount = 0;
const pages = {};
function makePage(name) {
  const p = makeNode('PAGE', name);
  p.name = name;
  return p;
}

const figma = {
  command: 'charts',
  loadFontAsync: async () => {},
  notify: (m) => calls.push(['notify', m]),
  closePlugin: () => calls.push(['close']),
  consoleErrors: [],
  createNodeFromSvg(svg) {
    svgCount++;
    if (!svg.includes('<svg') || !svg.includes('xmlns')) throw new Error('bad svg: ' + svg.slice(0, 80));
    const f = makeNode('FRAME', 'svg', 0, 0, 538, 180);
    f.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    return f;
  },
  createText: makeText,
  createFrame: () => makeNode('FRAME', 'frame', 0, 0, 100, 100),
  createRectangle: () => makeNode('RECTANGLE', 'rect', 0, 0, 100, 100),
  createComponentFromNode(node) {
    const c = makeNode('COMPONENT', node.name, node.x, node.y, node.width, node.height);
    c.description = '';
    for (const ch of node.children) c.appendChild(ch);
    c.createInstance = () => {
      const i = makeNode('INSTANCE', c.name, 0, 0, c.width, c.height);
      i._master = c;
      instances.push(i);
      return i;
    };
    return c;
  },
  combineAsVariants(comps, parent) {
    const set = makeNode('COMPONENT_SET', '', 0, 0, 600, 300);
    for (const c of comps) set.appendChild(c);
    parent.appendChild(set);
    return set;
  },
  createPage: () => {
    const p = makePage('page');
    figma.root.children.push(p); // 真实 Figma 中 createPage 会挂到 root
    return p;
  },
  root: { children: [] },
  currentPage: null,
};

// 搭建原型页面：home 页 + 3 组图表（图标/标题形态各异，覆盖两条识别路径）
const homePage = makePage('Home');
figma.currentPage = homePage;
figma.root.children = [homePage];
const home = makeNode('FRAME', '首页', 0, 0, 1440, 1068);
homePage.appendChild(home);
const g1 = makeChartGroup(home, { x: 244, y: 255, title: '近7天预约量趋势', icon: 'LineChartOutlined' });
const g2 = makeChartGroup(home, { x: 838, y: 255, title: '🥧 近7天各科室预约量', icon: null });
const g3 = makeChartGroup(home, { x: 244, y: 530, title: '近7天挂号收入', icon: 'DollarOutlined' });

const ctx = vm.createContext({ figma, console });
vm.runInContext(src, ctx);
await new Promise((r) => setTimeout(r, 400));

const notes = calls.filter(([k]) => k === 'notify').map(([, m]) => m);
const okRun1 = calls.some(([k, m]) => k === 'notify' && String(m).includes('✅ 图表组件化完成'))
  && instances.length === 3
  && home.findAll((n) => n.name === 'svg-icon').length === 0;
const findSet = () => {
  for (const p of figma.root.children) {
    const s = p.findOne((n) => n.type === 'COMPONENT_SET' && n.name === 'Chart');
    if (s) return s;
  }
  return null;
};
const setNode = findSet();
const variants = setNode ? setNode.children.map((c) => c.name).sort().join(',') : '';
const placedOk = instances.length === 3
  && instances.every((i) => [244, 838].includes(i.x) || true)
  && instances.filter((i) => i.x === 244 && i.y === 255).length === 1
  && instances.filter((i) => i.x === 838 && i.y === 255).length === 1
  && instances.filter((i) => i.x === 244 && i.y === 530).length === 1
  && instances.every((i) => i._master && /^Type=/.test(i._master.name));

console.log('notify(run1):', notes);
console.log('instances:', instances.map((i) => `${i._master.name}@${i.x},${i.y}`).join(' | '));
console.log('variants:', variants);
console.log('svg generated:', svgCount);

// 第二次运行：应提示未找到图表，且组件集不重建（幂等）
calls.length = 0;
const ctx2 = vm.createContext({ figma, console });
vm.runInContext(src, ctx2);
await new Promise((r) => setTimeout(r, 400));
const notes2 = calls.filter(([k]) => k === 'notify').map(([, m]) => m);
const setNode2 = findSet();
const okRun2 = notes2.some((m) => String(m).includes('未找到可转换的图表'))
  && setNode2
  && setNode2.children.length === 3;

if (okRun1 && placedOk && okRun2 && variants === 'Type=DeptBars,Type=Income,Type=Trend') {
  console.log('CHARTS SMOKE TEST PASS');
} else {
  console.log('okRun1:', okRun1, 'placedOk:', placedOk, 'okRun2:', okRun2);
  console.log('CHARTS SMOKE TEST FAIL');
  process.exit(1);
}