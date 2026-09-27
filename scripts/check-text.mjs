#!/usr/bin/env node
/**
 * 文本闸门：Layout IR 的「TEXT 节点」↔ 运行时 DOM 文本盒 逐节点断言
 *
 * 为什么需要这条腿（2026-09-26 弹窗文本事故）：
 *   4 个弹窗过像素闸门（dept 0.9087 / doctor 0.8975 **PASS**），但弹窗里
 *   ① label 文本整体左偏 8px（antd label 自带 8px flex gap，我们又加 margin-left:8 → 16px）
 *   ② 控件值 14px/居中 而 IR 是 15px / ink 顶 = 盒顶+11
 *   ③ 「全部医生」占位符用了 antd 灰 rgba(0,0,0,.25) 而 IR 是深色 #262626（色差 153）
 *   ④ 非必填 label 多渲染了一个 antd 默认的「：」
 *   ⑤「选择排班日期」label 内容 92.1 > 列内容 90，IR 里 * 掉第二行，实现却左溢出 12px
 *   前两条像素腿**结构性失明**：文本 ink 只占弹窗 40 万像素的极小比例，
 *   `pixelmatch threshold=0.25`（只统计色差 ≥25%）+ 整屏 SSIM 稀释 → 全都看不见；
 *   几何腿（visual:geom）也救不了：它只认「带 stroke 的 RECTANGLE」，**TEXT 节点不是 rect**，
 *   且当时**显式跳过 modal 屏**（`if (s.type === "modal") continue`）→ 弹窗文本零覆盖。
 *
 * 判据（全部从 IR 派生，无按屏配置）：
 *   1. IR 侧：`type === "TEXT"` 且文本非空的节点 → (x,y,w,h) + font.size + font.color
 *      坐标换算成 frame 相对值（弹窗 = 相对弹出框左上角，与 DOM 取 `.ant-modal-content` 同源）
 *   2. DOM 侧：按 **parentElement 分组**的文本节点（同一父元素内的文本节点拼接为一个测量单元，
 *      这样 `\n` 多行 / 多个文本节点 / `white-space` 换行都能与 IR 的「一个 TEXT 节点」对齐）；
 *      Range 盒给 (x,y,w,h)，computed style 给 font-size / color
 *   3. 匹配：文本归一化（去**全部**空白）后按 (y,x) 序**多重集一一配对**，数量必须相等
 *      —— 多出来 = 组件库多渲染了东西（如 antd 默认冒号），少了 = 该还原的文本没落
 *   4. 断言：`|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL`（默认 3px，同几何腿）+ `|Δfont-size| ≤ VISUAL_TEXT_SIZE_TOL`
 *      （默认 0.6px）+ color 完全相同
 *      容差 3px 而非 0：IR 文本盒（Figma 字面行框）与 DOM Range 盒（CSS line box）的 y 起点
 *      有 1~2px 的**度量约定差**（实测 13px 标签稳定 dy=−1~−2、右对齐右缘 dx=+1~+2），
 *      3px 是噪声地板；而本次事故的缺陷是 8px / 11px / 12px 与 1px 字号 → 仍全部命中
 *      **不断言 h**：IR 文本盒高 = Figma 字面行框，DOM Range 高 = CSS line-height，
 *      二者语义不同（本项目多处 line-height 有意大于字号，如 KPI 值 28px 字 / 40px 行高）
 *   5. 控件内文本（值 / 占位符）：IR 里落在「控件框」内的 TEXT 走**控件值断言**——
 *      取 DOM 控件的 value/placeholder（`<input>` 的值不是文本节点）+ computed font-size/color，
 *      只断言字号/颜色（位置由控件几何腿负责，文本基线是组件库内部布局）
 *
 * 豁免（框架通用规则，非按屏配置）：`*`（antd 必填星号由 CSS `::after` 渲染，无 DOM 文本节点）
 *
 * Usage（仓库根，需 api + web 已启动；必须 gate 模式取值，否则数据会随日期变）：
 *   npm run visual:text
 *   node scripts/check-text.mjs --screen=<spec.screens[].id>
 *   node scripts/check-text.mjs --probe        # 打印逐项偏差 + 未命中/多余清单
 * Env: WEB_URL / VISUAL_TEXT_TOL / VISUAL_TEXT_SIZE_TOL
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProject, gateCredentials, loadRootEnv } from "./lib/project.mjs";
import { isControlRect, irControlBoxes } from "./check-geometry.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const TOL = Number(process.env.VISUAL_TEXT_TOL || 3);
const SIZE_TOL = Number(process.env.VISUAL_TEXT_SIZE_TOL || 0.6);
const VIEWPORT = { width: 1440, height: 1068 };
const screenArg = (process.argv.find((a) => a.startsWith("--screen=")) || "").split("=")[1];
const probe = process.argv.includes("--probe");

/** 归一化：去掉全部空白（含 IR 里的 \n、DOM 里的换行/缩进），用于文本配对 */
const norm = (s) => String(s).replace(/\s+/g, "");
/** 归一化颜色到不透明的 `rgb(r, g, b)` 便于比较
 *  （IR 是 #RRGGBB，DOM 是 rgb()/rgba()；**必须把 alpha 合成到白底**——
 *   antd 占位符是 `rgba(0,0,0,0.25)`，丢 alpha 会得到 rgb(0,0,0)，
 *   而它在白底上的实际观感是 rgb(191,191,191) = IR 的 #BFBFBF，误判成「颜色错」） */
function normColor(c) {
  const s = String(c).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (rgba) {
    const p = rgba[1].split(",").map((x) => parseFloat(x));
    const a = p.length > 3 ? Math.max(0, Math.min(1, p[3])) : 1;
    const mix = (v) => Math.round(v * a + 255 * (1 - a));
    return `rgb(${mix(p[0])}, ${mix(p[1])}, ${mix(p[2])})`;
  }
  return s;
}

/** IR 的 TEXT 节点（frame 相对坐标） */
export function irTextNodes(ir) {
  const ox = ir.frame?.x ?? 0;
  const oy = ir.frame?.y ?? 0;
  const ctrl = irControlBoxes(ir);
  const inCtrl = (b) => ctrl.find((c) => b.x >= c.x && b.x + b.w <= c.x + c.w + 1 && b.y >= c.y - 1 && b.y + b.h <= c.y + c.h + 1);
  const out = [];
  (function walk(n) {
    if (!n) return;
    if (n.type === "TEXT" && n.box && n.text != null && String(n.text).trim() !== "") {
      const text = String(n.text);
      const box = {
        x: Math.round(n.box.x - ox),
        y: Math.round(n.box.y - oy),
        w: Math.round(n.box.w),
        h: Math.round(n.box.h),
      };
      // `*` 由 CSS ::after 渲染 → 无 DOM 文本节点，豁免（框架通用规则，非按屏配置）
      if (!/^\*$/.test(text.trim())) {
        out.push({
          id: n.id,
          text,
          key: norm(text),
          ...box,
          size: n.font?.size != null ? Math.round(Number(n.font.size) * 10) / 10 : null,
          color: n.font?.color ? normColor(n.font.color) : null,
          controlIndex: inCtrl(box) ? ctrl.indexOf(inCtrl(box)) : -1,
        });
      }
    }
    for (const c of n.children || []) walk(c);
  })(ir.tree);
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** DOM 采集：按 parentElement 分组的文本盒 + 控件值/占位符 + 控件框（与几何腿同判据） */
const COLLECT = ({ modal }) => {
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
    // 控件内文本（值/占位符）走控件值断言，避免与控件路径重复计数。
    // 判据与 IR 侧 `inCtrl` 一致：文本盒必须落在控件框内才算控件文本——
    // TextArea 的 showCount 挂在控件元素内、却画在控件框下方，仍应是普通文本
    // （否则 IR 有 / DOM 无 → 假「缺文本」）
    const host = p.closest(CTRL);
    if (host) {
      const hr = host.getBoundingClientRect();
      const inside =
        box &&
        box.left >= hr.left - 1 &&
        box.right <= hr.right + 1 &&
        box.top >= hr.top - 1 &&
        box.bottom <= hr.bottom + 1;
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
    const phStyle = pick.el.tagName === "INPUT" || pick.el.tagName === "TEXTAREA" ? getComputedStyle(pick.el, "::placeholder") : null;
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
  // 图形层（canvas / svg）：里面的文字由图表库/图标库自己画，位置与字号不受我们用 CSS 约束，
  // 其还原度归像素腿 —— IR 文本中心若落在这些矩形内就跳过（不写死图表区坐标）
  const graphics = [...document.querySelectorAll("canvas, svg")]
    .filter((c) => inScope(c) && shown(c))
    .map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height };
    });
  return { texts, controls, graphics };
};

/** 目标屏：全量非 chrome 屏（含 modal）。导出供 visual:doctor 复算判据（不可带副作用） */
export function loadTargets() {
  const { slug, spec } = resolveProject(root);
  if (!slug) {
    console.error("未解析到项目 slug，先跑 npm run init:project");
    process.exit(1);
  }
  const irDir = resolve(root, "fixtures", slug, "layout-ir");
  const targets = [];
  for (const s of spec?.screens || []) {
    if (s.type === "chrome" || s.needsReview || !s.route) continue;
    const p = resolve(irDir, `${s.id}.json`);
    if (!existsSync(p)) continue;
    let ir;
    try {
      ir = JSON.parse(readFileSync(p, "utf-8"));
    } catch {
      continue;
    }
    const texts = irTextNodes(ir);
    if (!texts.length) continue;
    targets.push({ id: s.id, name: s.name, route: s.route, modal: s.type === "modal", trigger: s.modal?.trigger, ir, texts });
  }
  return targets;
}

async function main() {
  const { chromium } = (() => {
    try {
      return require("playwright");
    } catch {
      console.error("缺少 playwright。Run: npm i -D playwright");
      process.exit(1);
    }
  })();

  const targets = loadTargets().filter((t) => !screenArg || t.id === screenArg || t.name === screenArg);
  if (!targets.length) {
    console.log("无含 TEXT 节点的屏需要文本断言，跳过。");
    return;
  }

  const { email, password, storageKey } = gateCredentials(root);
  const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.access_token || loginBody.token;
  if (!loginRes.ok || !token) {
    console.error(`登录失败 ${loginRes.status}，请确认 api(3001)/web(5173) 已启动且 seedAdmin 有效`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, user, storageKey }) => {
      localStorage.setItem(storageKey, token);
      localStorage.setItem(storageKey + "_user", JSON.stringify(user));
    },
    { token, user: loginBody.user, storageKey },
  );

  console.log(
    `🔤 文本闸门（Layout IR TEXT ↔ DOM 文本盒，容差 ${TOL}px / 字号 ${SIZE_TOL}px / 颜色全等）— ${targets.length} 屏\n`,
  );

  let failed = 0;
  const results = [];
  for (const t of targets) {
    await page.setViewportSize(VIEWPORT);
    await page.goto(`${WEB_URL}${t.route}?visualGate=1`, { waitUntil: "networkidle", timeout: 30000 });
    if (t.modal) {
      try {
        await page.getByRole("button", { name: t.trigger || /新增/ }).click({ force: true });
        await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
        await page.waitForTimeout(400);
      } catch (err) {
        failed++;
        console.log(`❌ ${t.name} (${t.route}) — 弹窗打开失败：${err.message}`);
        results.push({ screen: t.name, ok: false, problems: [`弹窗打开失败 ${err.message}`] });
        continue;
      }
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const dom = await page.evaluate(COLLECT, { modal: !!t.modal });
    if (!dom) {
      failed++;
      console.log(`❌ ${t.name} (${t.route}) — 未取到 ${t.modal ? ".ant-modal-content" : "document"} 作用域`);
      results.push({ screen: t.name, ok: false, problems: ["采集作用域缺失"] });
      continue;
    }

    const problems = [];
    const skipped = { glyph: 0, canvas: 0 };
    const insideAny = (b, rects) =>
      rects.some(
        (r) =>
          b.x + b.w / 2 >= r.x && b.x + b.w / 2 <= r.x + r.w && b.y + b.h / 2 >= r.y && b.y + b.h / 2 <= r.y + r.h,
      );
    // —— 文本节点配对（多重集，同文本取**位置最近**的一个）：数量必须相等 ——
    const pool = dom.texts.slice();
    const pairs = [];
    const missing = [];
    const cy = (o) => o.y + o.h / 2; // 比中心 y：IR 文本盒高（Figma 字面框）与 DOM Range 高（CSS line box）语义不同
    const score = (d, e) => Math.abs(cy(d) - cy(e)) * 4 + Math.abs(d.x - e.x);
    for (const e of t.texts) {
      if (e.controlIndex >= 0) continue; // 控件内文本走控件值断言
      // 图标字形：原型里单字符、非中英文数字的文本（‹ › × ✓ ▲ …）本质是图标，
      // 实现侧由图标库渲染成 SVG（无文本节点），其还原度归像素腿管（框架通用规则，非按屏配置）
      if (e.text.length === 1 && !/[\u4e00-\u9fa5A-Za-z0-9]/.test(e.text)) {
        skipped.glyph++;
        continue;
      }
      // 图表标签：由图表库画进 <canvas>/<svg>，DOM 里没有（或位置由库自己算），
      // 其还原度由像素腿负责（用「IR 文本中心是否落在某个 canvas/svg 里」判定，不写死图表区坐标）
      if (insideAny(e, dom.graphics)) {
        skipped.canvas++;
        continue;
      }
      const cands = pool.filter((d) => d.key === e.key);
      if (!cands.length) {
        missing.push(e);
        continue;
      }
      cands.sort((a, b) => score(a, e) - score(b, e)); // 同名文本（如日历里多个「张伟」）取最近的一个
      const d = cands[0];
      pool.splice(pool.indexOf(d), 1);
      const dv = { dx: d.x - e.x, dy: Math.round(cy(d) - cy(e)), dw: d.w - e.w };
      const worst = Math.max(...Object.values(dv).map(Math.abs));
      const sizeDev = e.size != null ? Math.abs(d.size - e.size) : 0;
      const colorOk = !e.color || normColor(d.color) === e.color;
      pairs.push({ e, d, dv, worst, sizeDev, colorOk });
      if (worst > TOL) {
        problems.push(
          `「${e.text}」位置偏差 dx=${dv.dx} dy=${dv.dy} dw=${dv.dw}（IR ${e.w}x${e.h}@${e.x},${e.y} vs DOM ${d.w}x${d.h}@${d.x},${d.y}）${d.cls}`,
        );
      }
      if (sizeDev > SIZE_TOL) {
        problems.push(`「${e.text}」字号 ${d.size}px ≠ IR ${e.size}px（差 ${sizeDev.toFixed(1)}px）${d.cls}`);
      }
      if (!colorOk) {
        problems.push(`「${e.text}」颜色 ${normColor(d.color)} ≠ IR ${e.color} ${d.cls}`);
      }
    }
    for (const e of missing) {
      problems.push(`IR 有但 DOM 没有：「${e.text}」@${e.x},${e.y} ${e.w}x${e.h}（该还原的文本没落 / 被组件库改写或吞掉）`);
    }
    // DOM 多出来的 = 组件库多渲染了东西（antd 默认冒号就是这样被抓住的）
    for (const d of pool) {
      if (d.nested) continue; // 含嵌套控件的容器文本由控件值断言覆盖
      if (insideAny(d, dom.graphics)) continue; // 图形层内的文字归像素腿
      problems.push(`DOM 多出 IR 没有的文本：「${d.raw.trim()}」@${d.x},${d.y} ${d.w}x${d.h} ${d.cls}`);
    }

    // —— 控件内文本（值/占位符）：字号 + 颜色 ——
    const ctrls = [];
    const irCtrlBoxes = irControlBoxes(t.ir);
    if (irCtrlBoxes.length && dom.controls.length !== irCtrlBoxes.length) {
      problems.push(`控件数量不符（值/占位断言基数）：IR ${irCtrlBoxes.length} 个 vs DOM ${dom.controls.length} 个`);
    }
    for (let i = 0; i < Math.min(irCtrlBoxes.length, dom.controls.length); i++) {
      const c = dom.controls[i];
      const inside = t.texts.filter((x) => x.controlIndex === i);
      ctrls.push({ box: irCtrlBoxes[i], dom: c, inside: inside.map((x) => x.text) });
      for (const e of inside) {
        if (c.key !== e.key) {
          problems.push(
            `控件值不符：IR「${e.text}」vs DOM「${c.raw.trim()}」（${c.placeholder ? "占位符" : "值"}）${c.cls}`,
          );
        }
        if (e.size != null && Math.abs(c.size - e.size) > SIZE_TOL) {
          problems.push(`控件文本「${e.text}」字号 ${c.size}px ≠ IR ${e.size}px ${c.cls}`);
        }
        if (e.color && normColor(c.color) !== e.color) {
          problems.push(`控件文本「${e.text}」颜色 ${normColor(c.color)} ≠ IR ${e.color} ${c.cls}`);
        }
      }
    }

    const maxDev = pairs.length ? Math.max(...pairs.map((p) => p.worst)) : 0;
    if (problems.length) {
      failed++;
      console.log(`❌ ${t.name} (${t.route}) — IR TEXT ${t.texts.length} 项，问题 ${problems.length} 条`);
      for (const p of problems.slice(0, probe ? 40 : 12)) console.log(`   · ${p}`);
      if (!probe && problems.length > 12) console.log(`   · …还有 ${problems.length - 12} 条（--probe 看全）`);
    } else {
      console.log(
        `✅ ${t.name} (${t.route}) — ${t.texts.length} 个文本节点全部对齐（最大位置偏差 ${maxDev}px ≤ ${TOL}px）` +
          (skipped.glyph || skipped.canvas ? `（豁免 ${skipped.glyph} 图标字形 / ${skipped.canvas} 图表 canvas）` : ""),
      );
    }
    if (probe) {
      console.log(`   —— 逐项偏差（仅列 >0px 的）——`);
      for (const p of pairs.filter((x) => x.worst > 0).slice(0, 40)) {
        console.log(
          `   ${p.e.text.replace(/\n/g, "⏎").padEnd(24)} IR ${String(p.e.w).padStart(4)}x${String(p.e.h).padStart(3)}@${String(p.e.x).padStart(4)},${String(p.e.y).padStart(4)}` +
            ` DOM ${String(p.d.w).padStart(4)}x${String(p.d.h).padStart(3)}@${String(p.d.x).padStart(4)},${String(p.d.y).padStart(4)}` +
            ` Δ ${p.dv.dx},${p.dv.dy},${p.dv.dw} 字号 ${p.d.size}/${p.e.size} ${p.d.cls}`,
        );
      }
    }
    results.push({
      screen: t.name,
      route: t.route,
      textCount: t.texts.length,
      controlCount: irCtrlBoxes.length,
      ok: !problems.length,
      maxDev,
      problems,
    });
  }

  await browser.close();
  writeFileSync(
    resolve(root, "artifacts/visual-diff/text.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), tol: TOL, sizeTol: SIZE_TOL, results }, null, 2),
  );
  console.log(
    `\n${failed ? `❌ 文本断言失败：${failed} 屏（详见 artifacts/visual-diff/text.json）` : "✅ 全部屏文本与 Layout IR 一致"}`,
  );
  if (failed) process.exitCode = 1;
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
