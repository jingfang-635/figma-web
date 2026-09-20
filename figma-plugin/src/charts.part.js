// ============================================================
// 图表 → 组件（数据重建）— 阳光医疗首页 3 个 svg-icon 图表
// 数据源：apps/web/src/blueprints/home.json（Layout IR 反推）
// 产出：组件页「🧩 Charts」里的 Chart 组件集（Type=Trend/DeptBars/Income），
//       原型画布中的图表卡片原位替换为实例，视觉与原稿对齐。
// 依赖（在 logic.part.js 中定义，运行时可用）：makeIcon / notify / ERRORS
// ============================================================

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function solid(hex) {
  return { type: 'SOLID', color: hexToRgb(hex) };
}

const CHARTS_PAGE_NAME = '🧩 Charts';
const CHART_SET_NAME = 'Chart';

// 原型图表公共几何（相对 538×180 绘图区，量自 Layout IR home.json）
const PLOT = { W: 538, H: 180, LEFT: 68, RIGHT: 490, BOTTOM: 149, XLABEL_Y: 157 };

// 蓝图样本数据（与 apps/web/src/blueprints/home.json sample 一致）
const CHART_SERIES = {
  trend: [
    ['8/1', 12], ['8/2', 8], ['8/3', 15], ['8/4', 10], ['8/5', 18], ['8/6', 22], ['今日', 5],
  ],
  deptBars: [
    ['内科', 38], ['妇科', 25], ['儿科', 20], ['口腔科', 15], ['皮肤科', 8],
  ],
  income: [
    ['8/1', 360], ['8/2', 240], ['8/3', 450], ['8/4', 300], ['8/5', 540], ['8/6', 660], ['今日', 150],
  ],
};

function seriesOf(key) {
  return CHART_SERIES[key].map(([label, value]) => ({ label, value }));
}

const CHART_SPECS = {
  trend: {
    key: 'trend',
    variant: 'Trend',
    kind: 'line',
    title: '近7天预约量趋势',
    icon: 'LineChartOutlined',
    color: '#1890FF',
    lastDot: '#91D5FF',
    ticks: [0, 5, 10, 15, 20, 25],
    plotTop: 10,
    yRight: 54,
    firstX: 125.5,
    lastX: 471,
    highlightLast: 2,
    valueFmt: (v) => String(v),
    data: seriesOf('trend'),
  },
  deptBars: {
    key: 'deptBars',
    variant: 'DeptBars',
    kind: 'bar',
    title: '近7天各科室预约量',
    icon: 'PieChartOutlined',
    fills: ['#1890FF', '#69C0FF', '#91D5FF', '#BAE7FF', '#E6F7FF'],
    ticks: [0, 10, 20, 30, 40],
    plotTop: 15,
    yRight: 65,
    firstX: 114.5,
    lastX: 443.5,
    barW: 49,
    valueFmt: (v) => String(v),
    data: seriesOf('deptBars'),
  },
  income: {
    key: 'income',
    variant: 'Income',
    kind: 'line',
    title: '近7天挂号收入',
    icon: 'DollarOutlined',
    color: '#52C41A',
    lastDot: '#B7EB8F',
    ticks: [0, 150, 300, 450, 600, 750],
    plotTop: 10,
    yRight: 54,
    firstX: 125.5,
    lastX: 471,
    highlightLast: 2,
    valueFmt: (v) => '¥' + v,
    labelColorAll: true,
    data: seriesOf('income'),
  },
};

const CHART_FALLBACK_ORDER = ['trend', 'deptBars', 'income'];

async function loadChartFonts() {
  const fonts = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Bold' },
    { family: 'Noto Sans SC', style: 'Regular' },
    { family: 'Noto Sans SC', style: 'Medium' },
    { family: 'Noto Sans SC', style: 'Bold' },
  ];
  for (const f of fonts) {
    try {
      await figma.loadFontAsync(f);
    } catch (e) {
      /* 单个字体不可用继续 */
    }
  }
}

/** 依次尝试设置字体（目标样式缺失时逐级回退，保证中文不丢） */
function applyFont(t, family, style) {
  const chain = [
    { family, style },
    { family, style: 'Regular' },
    { family: 'Inter', style: 'Regular' },
  ];
  for (const f of chain) {
    try {
      t.fontName = f;
      return;
    } catch (e) {
      /* 下一个 */
    }
  }
}

/** 固定盒子文本标签（居中/右对齐），不依赖 measureText */
function makeLabel(text, opts) {
  const t = figma.createText();
  t.name = 'label';
  const cjk = /[\u4e00-\u9fa5]/.test(text);
  applyFont(t, cjk ? 'Noto Sans SC' : (opts.font || 'Inter'), opts.bold ? 'Bold' : 'Regular');
  t.fontSize = opts.size || 12;
  t.characters = text;
  t.fills = [solid(opts.color || '#000000')];
  try {
    t.textAutoResize = 'NONE';
  } catch (e) {
    /* mock/旧版忽略 */
  }
  t.textAlignHorizontal = opts.align || 'CENTER';
  try {
    t.textAlignVertical = 'CENTER';
  } catch (e) {
    /* ignore */
  }
  t.resize(opts.w, opts.h || 15);
  t.x = opts.x;
  t.y = opts.y;
  return t;
}

function plotScale(spec) {
  const maxTick = spec.ticks[spec.ticks.length - 1] || 1;
  return (PLOT.BOTTOM - spec.plotTop) / maxTick;
}

function xStepOf(spec) {
  const n = spec.data.length;
  return n > 1 ? (spec.lastX - spec.firstX) / (n - 1) : 0;
}

/** 折线图绘图区：网格 + 折线 + 圆点（SVG），刻度/数值标签为原生文本 */
function lineChartSvg(spec) {
  const scale = plotScale(spec);
  const step = xStepOf(spec);
  const pts = spec.data.map((p, i) => [spec.firstX + i * step, PLOT.BOTTOM - p.value * scale]);
  let s = `<svg width="${PLOT.W}" height="${PLOT.H}" viewBox="0 0 ${PLOT.W} ${PLOT.H}" fill="none" xmlns="http://www.w3.org/2000/svg">`;
  s += `<line x1="${PLOT.LEFT}" y1="${spec.plotTop}" x2="${PLOT.LEFT}" y2="${PLOT.BOTTOM}" stroke="#F0F0F0" stroke-width="1"/>`;
  for (const t of spec.ticks) {
    const y = (PLOT.BOTTOM - t * scale).toFixed(1);
    s += `<line x1="${PLOT.LEFT}" y1="${y}" x2="${PLOT.RIGHT}" y2="${y}" stroke="${t === 0 ? '#D9D9D9' : '#F0F0F0'}" stroke-width="1"/>`;
  }
  s += `<polyline points="${pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" stroke="${spec.color}" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  pts.forEach((p, i) => {
    const cx = p[0].toFixed(1);
    const cy = p[1].toFixed(1);
    if (i === pts.length - 1) {
      s += `<circle cx="${cx}" cy="${cy}" r="5" fill="${spec.lastDot}"/>`;
    } else {
      s += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#FFFFFF" stroke="${spec.color}" stroke-width="2"/>`;
    }
  });
  s += `</svg>`;
  return s;
}

/** 轴刻度 + X 标签 + 数值标签（折线/柱状共用） */
function addAxisLabels(spec, frame) {
  const scale = plotScale(spec);
  const step = xStepOf(spec);
  const n = spec.data.length;
  for (const t of spec.ticks) {
    const y = PLOT.BOTTOM - t * scale;
    // 原型中折线图不显示 0 刻度标签（底轴即 0），柱状图显示
    if (t === 0 && spec.kind === 'line') continue;
    frame.appendChild(makeLabel(String(t), { x: spec.yRight - 24, y: y - 7.5, w: 24, h: 15, align: 'RIGHT', size: 12 }));
  }
  spec.data.forEach((p, i) => {
    const cx = spec.firstX + i * step;
    const isToday = p.label === '今日';
    frame.appendChild(makeLabel(p.label, {
      x: cx - 20,
      y: PLOT.XLABEL_Y,
      w: 40,
      h: 14,
      align: 'CENTER',
      size: cjkLabelSize(p.label),
      bold: isToday,
      color: isToday && spec.color ? spec.color : '#000000',
    }));
  });
  if (spec.kind === 'line') {
    spec.data.forEach((p, i) => {
      const cx = spec.firstX + i * step;
      const cy = PLOT.BOTTOM - p.value * scale;
      const hl = spec.highlightLast && i >= n - spec.highlightLast;
      const colored = hl || spec.labelColorAll;
      frame.appendChild(makeLabel(spec.valueFmt(p.value), {
        x: cx - 22, y: cy - 20, w: 44, h: 15, align: 'CENTER', size: 12,
        bold: !!hl, color: colored ? spec.color : '#000000',
      }));
    });
  } else {
    spec.data.forEach((p, i) => {
      const cx = spec.firstX + i * step;
      const h = p.value * scale;
      frame.appendChild(makeLabel(spec.valueFmt(p.value), {
        x: cx - 20, y: PLOT.BOTTOM - h - 17, w: 40, h: 15, align: 'CENTER', size: 12,
      }));
    });
  }
}

function cjkLabelSize(label) {
  return /[\u4e00-\u9fa5]/.test(label) ? 12 : 11;
}

/** 柱状图绘图区：原生矩形（设计师可直接改高度/颜色）+ 网格 + 标签 */
function buildBarPlot(spec) {
  const frame = figma.createFrame();
  frame.name = 'plot';
  frame.resize(PLOT.W, PLOT.H);
  frame.fills = [];
  const scale = plotScale(spec);
  const axis = figma.createRectangle();
  axis.name = 'axis';
  axis.resize(1, PLOT.BOTTOM - spec.plotTop);
  axis.fills = [solid('#D9D9D9')];
  axis.x = PLOT.LEFT;
  axis.y = spec.plotTop;
  frame.appendChild(axis);
  for (const t of spec.ticks) {
    const g = figma.createRectangle();
    g.name = 'grid';
    g.resize(PLOT.RIGHT - PLOT.LEFT, 1);
    g.fills = [solid(t === 0 ? '#D9D9D9' : '#F0F0F0')];
    g.x = PLOT.LEFT;
    g.y = PLOT.BOTTOM - t * scale;
    frame.appendChild(g);
  }
  const step = xStepOf(spec);
  spec.data.forEach((p, i) => {
    const cx = spec.firstX + i * step;
    const h = p.value * scale;
    const b = figma.createRectangle();
    b.name = 'bar-' + p.label;
    b.resize(spec.barW, h);
    b.fills = [solid(spec.fills[i % spec.fills.length])];
    b.x = cx - spec.barW / 2;
    b.y = PLOT.BOTTOM - h;
    frame.appendChild(b);
  });
  addAxisLabels(spec, frame);
  return frame;
}

function buildLinePlot(spec) {
  const frame = figma.createNodeFromSvg(lineChartSvg(spec));
  frame.name = 'plot';
  frame.fills = [];
  addAxisLabels(spec, frame);
  return frame;
}

/** 图表卡片：578×259 白底圆角卡 + 图标标题 + 绘图区（与原型逐像素对齐） */
function buildChartCard(spec) {
  const card = figma.createFrame();
  card.name = 'Chart/' + spec.variant;
  card.resize(578, 259);
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.cornerRadius = 8;
  try {
    card.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      offset: { x: 0, y: 1 },
      radius: 2,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];
  } catch (e) {
    /* ignore */
  }
  const icon = makeIcon(spec.icon, 14, { r: 0.149, g: 0.149, b: 0.149 });
  if (icon) {
    icon.x = 20;
    icon.y = 21;
    card.appendChild(icon);
  }
  const title = figma.createText();
  title.name = 'title';
  applyFont(title, 'Noto Sans SC', 'Medium');
  title.fontSize = 14;
  title.characters = spec.title;
  title.fills = [solid('#262626')];
  title.x = icon ? 40 : 20;
  title.y = 20;
  card.appendChild(title);
  const plot = spec.kind === 'bar' ? buildBarPlot(spec) : buildLinePlot(spec);
  plot.x = 20;
  plot.y = 55;
  card.appendChild(plot);
  return card;
}

/** 在整页/选区里收集 538×180 的 svg-icon 图表帧 */
function collectSvgCharts(roots, out) {
  const stack = [];
  for (const r of roots || []) if (r) stack.push(r);
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    const w = n.width || 0;
    const h = n.height || 0;
    if (typeof n.name === 'string' && n.name.indexOf('svg-icon') >= 0 && Math.abs(w - 538) <= 4 && Math.abs(h - 180) <= 4) {
      out.push(n);
      continue;
    }
    const kids = n.children;
    if (Array.isArray(kids)) for (const c of kids) stack.push(c);
  }
  return out;
}

/** 由 svg-icon 定位同层兄弟：白底卡片矩形 + 标题文本 + 标题图标 */
function identifyChart(svgIcon) {
  const parent = svgIcon.parent;
  if (!parent) return null;
  const sibs = parent.children || [];
  const sx = svgIcon.x;
  const sy = svgIcon.y;
  const sw = svgIcon.width || 0;
  const sh = svgIcon.height || 0;
  let cardRect = null;
  for (const s of sibs) {
    if (s === svgIcon || s.type !== 'RECTANGLE') continue;
    if (Math.abs((s.width || 0) - 578) > 6 || Math.abs((s.height || 0) - 259) > 6) continue;
    if (s.x <= sx && s.y <= sy && s.x + (s.width || 0) >= sx + sw && s.y + (s.height || 0) >= sy + sh) {
      cardRect = s;
      break;
    }
  }
  if (!cardRect) return null;
  let titleText = null;
  let titleIcon = null;
  for (const s of sibs) {
    if (s === svgIcon || s === cardRect) continue;
    const inside = s.y < sy && s.y >= cardRect.y - 2 && s.x >= cardRect.x - 2 &&
      s.x + (s.width || 0) <= cardRect.x + (cardRect.width || 0) + 2;
    if (!inside) continue;
    if (s.type === 'TEXT' && s.characters) titleText = s;
    else if (s.type === 'FRAME' && (s.width || 0) <= 24) titleIcon = s;
  }
  return { svgIcon, cardRect, titleText, titleIcon };
}

const CHART_TITLE_MATCH = [
  ['预约量趋势', 'trend'],
  ['科室预约量', 'deptBars'],
  ['挂号收入', 'income'],
];

function specFor(item, fallbackIndex) {
  const t = item.titleText && item.titleText.characters ? item.titleText.characters : '';
  for (const [needle, key] of CHART_TITLE_MATCH) {
    if (t.indexOf(needle) >= 0) return CHART_SPECS[key];
  }
  return CHART_SPECS[CHART_FALLBACK_ORDER[fallbackIndex % CHART_FALLBACK_ORDER.length]];
}

function ensureChartsPage() {
  for (const p of figma.root.children || []) {
    if (p.name === CHARTS_PAGE_NAME) return p;
  }
  const p = figma.createPage();
  p.name = CHARTS_PAGE_NAME;
  return p;
}

/** 复用已有 Chart 组件集；缺变体时整体重建 */
async function ensureMasters(page) {
  let set = null;
  for (const p of figma.root.children || []) {
    const found = p.findOne && p.findOne((n) => n.type === 'COMPONENT_SET' && n.name === CHART_SET_NAME);
    if (found) {
      set = found;
      break;
    }
  }
  const masters = {};
  if (set) {
    for (const c of set.children || []) {
      const m = /^Type=([^=]+)$/.exec(c.name || '');
      if (m) masters[m[1]] = c;
    }
  }
  const missing = Object.keys(CHART_SPECS).filter((k) => !masters[CHART_SPECS[k].variant]);
  if (missing.length) {
    if (set) set.remove();
    const comps = [];
    for (const k of Object.keys(CHART_SPECS)) {
      const spec = CHART_SPECS[k];
      const card = buildChartCard(spec);
      const comp = figma.createComponentFromNode(card);
      comp.name = 'Type=' + spec.variant;
      try {
        comp.description = '阳光医疗首页图表 · 数据源 apps/web/src/blueprints/home.json';
      } catch (e) {
        /* ignore */
      }
      page.appendChild(comp);
      comps.push(comp);
      masters[spec.variant] = comp;
    }
    const vs = figma.combineAsVariants(comps, page);
    vs.name = CHART_SET_NAME;
    vs.x = 0;
    vs.y = 0;
  }
  return masters;
}

async function runCharts() {
  await loadChartFonts();
  const sel = figma.currentPage.selection || [];
  const roots = sel.length ? sel : [figma.currentPage];
  const found = collectSvgCharts(roots, []);
  const items = [];
  for (const svgIcon of found) {
    const it = identifyChart(svgIcon);
    if (it) items.push(it);
    else ERRORS.push('svg-icon 缺少同层 578×259 卡片矩形: ' + (svgIcon.name || svgIcon.id || '?'));
  }
  if (!items.length) {
    notify('未找到可转换的图表（svg-icon 538×180）。可能已转换过，或请打开「首页」所在页面后重试。');
    figma.closePlugin();
    return;
  }
  items.sort((a, b) => (a.cardRect.y - b.cardRect.y) || (a.cardRect.x - b.cardRect.x));
  const page = ensureChartsPage();
  const masters = await ensureMasters(page);
  let made = 0;
  const detail = [];
  let fb = 0;
  for (const it of items) {
    try {
      const spec = specFor(it, fb);
      fb++;
      const master = masters[spec.variant];
      if (!master) {
        ERRORS.push(spec.variant + ': 主组件缺失');
        continue;
      }
      const parent = it.cardRect.parent;
      const inst = master.createInstance();
      const idx = parent ? parent.children.indexOf(it.cardRect) : 0;
      if (parent) parent.insertChild(idx < 0 ? parent.children.length : idx, inst);
      inst.x = it.cardRect.x;
      inst.y = it.cardRect.y;
      for (const n of [it.titleIcon, it.titleText, it.svgIcon, it.cardRect]) {
        if (n && n.parent) n.remove();
      }
      made++;
      detail.push(spec.variant);
    } catch (e) {
      ERRORS.push('图表替换失败: ' + (e && e.message ? e.message : e));
    }
  }
  if (made) {
    notify('✅ 图表组件化完成：替换 ' + made + ' 处（' + detail.join('、') + '），组件库 → 页面「' + CHARTS_PAGE_NAME + '」');
  } else {
    notify('⚠️ 未能替换任何图表，详情见控制台');
  }
  if (ERRORS.length) {
    console.error('[chart-to-component] 失败明细:', ERRORS.join(' | '));
    notify('⚠️ ' + ERRORS.length + ' 处异常，详情见控制台');
  }
  figma.closePlugin();
}