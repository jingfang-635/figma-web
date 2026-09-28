/**
 * 页面内采集器（在浏览器里执行；判据全部通用，含 **零** 按屏 / 业务值）。
 *
 * 为什么集中到一处：文本腿 / 几何腿 / 回填腿 / 活数据腿此前**各自导航一遍页面**
 * 再各自 `page.evaluate` 采集，同一份 DOM 被重复读 4 遍（约 45 次导航）。
 * 现在由 collect-pass 在**一趟导航**里跑完这里的所有采集器，
 * 结果落 `artifacts/visual-diff/dom-snapshot.json`，各腿只做纯断言（不再开浏览器）。
 *
 * 这些函数会被 `page.evaluate(fn, arg)` 序列化执行，因此：
 *   - 不得引用模块作用域变量（除参数）
 *   - 不得依赖 Node API
 */

/** 文本腿采集：按 parentElement 分组的文本盒 + 控件值/占位符 + 图形层矩形。 */
export const COLLECT_TEXT = ({ modal }) => {
  const scopeEl = modal ? document.querySelector(".ant-modal-content") : document.documentElement;
  if (!scopeEl) return null;
  const o = modal ? scopeEl.getBoundingClientRect() : { x: 0, y: 0 };
  const inScope = (el) => (modal ? scopeEl.contains(el) || el === scopeEl : true);
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    return el.getClientRects().length > 0;
  };
  const CTRL = [
    "input.ant-input",
    "textarea.ant-input",
    ".ant-input-affix-wrapper",
    ".ant-select-selector",
    ".ant-picker",
    ".ant-input-number",
  ].join(",");
  const ctrlEls = [...document.querySelectorAll(CTRL)].filter((e) => inScope(e) && shown(e));
  const outerCtrl = ctrlEls.filter((e) => !ctrlEls.some((x) => x !== e && x.contains(e)));

  // —— 文本节点按 parentElement 分组（同父的文本节点拼接＝IR 的一个 TEXT 节点）——
  const groups = new Map();
  const walker = document.createTreeWalker(scopeEl, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue;
    if (!t || !t.trim()) continue;
    const p = n.parentElement;
    if (!p || !inScope(p) || !shown(p)) continue;
    const tag = p.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") continue;
    if (p.closest("svg")) continue; // SVG 里的文字是图形（图表标签/图标字形），归像素腿
    let box = null;
    try {
      const r = document.createRange();
      r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 0 || b.height > 0) box = b;
    } catch {
      /* ignore */
    }
    // 组件库的离屏量测节点（如 recharts 的 #recharts_measurement_span：aria-hidden + top:-20000px）
    // 不是界面内容 → 跳过（框架通用规则，非按屏配置）
    if (p.closest('[aria-hidden="true"]') && (!box || box.top < -1000 || box.left < -1000)) continue;
    // 控件内文本（值/占位符）走控件值断言，避免与控件路径重复计数
    const host = p.closest(CTRL);
    if (host) {
      const hr = host.getBoundingClientRect();
      const inside =
        box && box.left >= hr.left - 1 && box.right <= hr.right + 1 && box.top >= hr.top - 1 && box.bottom <= hr.bottom + 1;
      if (inside) continue;
    }
    if (!groups.has(p)) groups.set(p, { cls: p.className?.toString?.().slice(0, 40) || tag, texts: [], rects: [] });
    const g = groups.get(p);
    g.texts.push(t);
    if (box) g.rects.push(box);
  }
  const texts = [];
  for (const [p, g] of groups) {
    if (!g.rects.length) continue;
    const cs = getComputedStyle(p);
    // SVG（图表文字常见）用 fill 上色，`color` 只是 CSS 继承值 → 取 fill 才不会假报颜色不符
    const isSvg = p.namespaceURI === "http://www.w3.org/2000/svg";
    const paint = isSvg ? (cs.fill && cs.fill !== "none" ? cs.fill : cs.stroke) : cs.color;
    const x0 = Math.min(...g.rects.map((r) => r.left));
    const y0 = Math.min(...g.rects.map((r) => r.top));
    const x1 = Math.max(...g.rects.map((r) => r.right));
    const y1 = Math.max(...g.rects.map((r) => r.bottom));
    texts.push({
      key: g.texts.join("").replace(/\s+/g, ""),
      raw: g.texts.join(""),
      cls: (isSvg ? p.getAttribute("class") : p.className?.toString?.())?.slice(0, 40) || p.tagName,
      x: Math.round(x0 - o.x),
      y: Math.round(y0 - o.y),
      w: Math.round(x1 - x0),
      h: Math.round(y1 - y0),
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      color: paint,
      nested: p.querySelector(CTRL) ? 1 : 0,
    });
  }
  texts.sort((a, b) => a.y - b.y || a.x - b.x);

  // —— 控件（与几何腿同选择器，取最外层），取其值/占位符文本 + 字号/颜色 ——
  const controls = outerCtrl.map((e) => {
    const r = e.getBoundingClientRect();
    const pick = (() => {
      // 顺序要紧：① e 自身就是 input/textarea 时 textContent 恒为空（值在 .value 上）
      // ② antd v5 的 Select 里有一个隐藏的 `.ant-select-selection-search-input`（值恒为空），
      //    若在取 item 之前先找 `input` 就会把值/占位符读成空字符串
      if (e.tagName === "INPUT" || e.tagName === "TEXTAREA") {
        const ph = !String(e.value).trim() && !!e.placeholder;
        return { el: e, text: e.value || e.placeholder || "", ph };
      }
      const item = e.querySelector(".ant-select-selection-item, .ant-select-selection-placeholder");
      if (item) {
        const isPh = item.className?.toString?.().includes("placeholder");
        return { el: item, text: item.textContent || "", ph: !!isPh };
      }
      const inner = e.querySelector("input, textarea");
      if (inner) {
        const ph = !String(inner.value).trim() && !!inner.placeholder;
        return { el: inner, text: inner.value || inner.placeholder || "", ph };
      }
      return { el: e, text: e.textContent || "", ph: false };
    })();
    const cs = getComputedStyle(pick.el);
    const phStyle =
      pick.el.tagName === "INPUT" || pick.el.tagName === "TEXTAREA" ? getComputedStyle(pick.el, "::placeholder") : null;
    return {
      cls: e.className?.toString?.().slice(0, 40) || e.tagName,
      x: Math.round(r.x - o.x),
      y: Math.round(r.y - o.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      key: String(pick.text).replace(/\s+/g, ""),
      raw: pick.text,
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      color: pick.ph && phStyle ? phStyle.color : cs.color,
      placeholder: pick.ph ? 1 : 0,
    };
  });
  controls.sort((a, b) => a.y - b.y || a.x - b.x);

  // 图形层（canvas / svg）：里面的文字由图表库/图标库自己画，其还原度归像素腿
  const graphics = [...document.querySelectorAll("canvas, svg")]
    .filter((c) => inScope(c) && shown(c))
    .map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height };
    });

  return { texts, controls, graphics };
};

/** 几何腿采集：最外层输入控件框（排除弹窗内部——弹窗控件由文本腿覆盖）。 */
export const COLLECT_GEOMETRY = () => {
  const SEL = [
    "input.ant-input",
    "textarea.ant-input",
    ".ant-input-affix-wrapper",
    ".ant-select-selector",
    ".ant-picker",
    ".ant-input-number",
  ].join(",");
  const els = [...document.querySelectorAll(SEL)].filter((e) => {
    if (e.closest(".ant-modal-root")) return false; // 弹窗内部控件由壳屏断言，此处不比
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  });
  const outer = els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
  return outer
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        cls: e.className?.toString?.().slice(0, 48) || e.tagName,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
};

/** 回填腿采集（非 gate）：表单控件值 + KPI + 正文文本。 */
export const COLLECT_BACKFILL = () => {
  const formVals = {};
  document.querySelectorAll(".ant-form-item").forEach((item) => {
    const label = item.querySelector(".ant-form-item-label label")?.textContent?.replace("*", "").trim();
    const ctrl = item.querySelector("input, textarea");
    if (label && ctrl) formVals[label] = ctrl.value ?? "";
  });
  const kpis = {};
  document.querySelectorAll(".kpi-card").forEach((c) => {
    kpis[c.querySelector(".kpi-label")?.textContent?.trim() || ""] = c.querySelector(".kpi-value")?.textContent?.trim() || "";
  });
  return {
    formVals,
    kpis,
    bodyText: document.querySelector(".app-content")?.textContent || document.body.textContent || "",
  };
};

/** 活数据腿采集（非 gate）：正文文本 + 表格行文本。 */
export const COLLECT_LIVE = () => ({
  bodyText: document.querySelector(".app-content")?.textContent || document.body.textContent || "",
  tableRows: [...document.querySelectorAll(".ant-table-tbody tr.ant-table-row")].map((tr) =>
    tr.textContent.replace(/\s+/g, ""),
  ),
});

/**
 * 宽视口自适应取样：量一批元素框 + 弹窗（含可用宽度）。
 * 选择器是**结构类名集合**（壳层/卡片/表格/日历…），与具体项目无关。
 */
export const PROBE_SELECTORS = [
  ".app-content",
  ".page",
  ".page-head",
  ".kpi-strip",
  ".kpi-card",
  ".chart-grid",
  ".chart-card",
  ".metric-grid",
  ".metric-cell",
  ".ant-card",
  ".list-toolbar",
  ".ant-table",
  ".ant-table-thead > tr > th",
  ".calendar-wrap",
  ".calendar-grid",
  ".calendar-cell",
  ".schedule-toolbar",
  ".legend-row",
  ".org-card",
  ".org-grid",
  ".org-grid > .ant-form-item",
];

export const PROBE_LAYOUT = (sels) => {
  const items = [];
  for (const sel of sels) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      items.push({ sel, x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    }
  }
  const mc = document.querySelector(".ant-modal-content");
  const mr = mc ? mc.getBoundingClientRect() : null;
  const pageEl = document.querySelector(".page");
  const pr = pageEl ? pageEl.getBoundingClientRect() : null;
  const padRight = 24; // body padding（.app-content 24px）
  return {
    avail: document.documentElement.clientWidth,
    docScrollW: document.documentElement.scrollWidth,
    modal: mr ? { w: +mr.width.toFixed(2), h: +mr.height.toFixed(2), cx: +(mr.x + mr.width / 2).toFixed(2) } : null,
    viewportCx: window.innerWidth / 2,
    contentW: pr ? +pr.width.toFixed(2) : 0,
    fillGap: pr ? +(window.innerWidth - pr.right).toFixed(2) - padRight : 0,
    items,
  };
};
