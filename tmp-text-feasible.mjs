/**
 * 可行性测量：IR 的 TEXT 节点（x,y,w,h）↔ DOM Range 文本盒，能否 1:1 配对？
 * 目的：判断「文本级几何腿」是可强制实施的判据，还是不可靠的噪声源。
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject, gateCredentials, loadRootEnv } from "./scripts/lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);
const { chromium } = require("playwright");
const { slug, spec } = resolveProject(root);
const { email, password, storageKey } = gateCredentials(root);
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";

const irDir = resolve(root, "fixtures", slug, "layout-ir");

/** IR 的 TEXT 节点（带 box + font）。排除空文本 */
function irTexts(ir) {
  const ox = ir.frame?.x ?? 0, oy = ir.frame?.y ?? 0;
  const out = [];
  (function walk(n) {
    if (!n) return;
    if (n.type === "TEXT" && n.box && n.text != null && String(n.text).trim() !== "") {
      out.push({
        id: n.id,
        text: String(n.text),
        x: Math.round(n.box.x - ox),
        y: Math.round(n.box.y - oy),
        w: Math.round(n.box.w),
        h: Math.round(n.box.h),
        size: n.font?.size ?? null,
        color: n.font?.color ?? null,
      });
    }
    for (const c of n.children || []) walk(c);
  })(ir.tree);
  return out;
}

/** DOM 侧：叶子文本节点的 Range 盒（Range 盒 ≈ Figma 文本盒，非像素 ink） */
const DOM_TEXTS = (scopeTxt) => {
  const scope = scopeTxt === "modal" ? document.querySelector(".ant-modal-content") : document.querySelector(".app-content");
  if (!scope) return { origin: null, items: [] };
  const r0 = scope.getBoundingClientRect();
  const skip = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return true;
    if (el.closest(".ant-modal-content") !== scope && scopeTxt === "modal") return true;
    return false;
  };
  const items = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const parent = n.parentElement;
    if (!parent || skip(parent)) continue;
    if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE") continue;
    let r;
    try {
      const range = document.createRange();
      range.selectNodeContents(n);
      r = range.getBoundingClientRect();
    } catch { continue; }
    if (r.width < 0.5 || r.height < 0.5) continue;
    const cs = getComputedStyle(parent);
    items.push({
      text: t,
      x: Math.round(r.x - r0.x), y: Math.round(r.y - r0.y),
      w: Math.round(r.width), h: Math.round(r.height),
      cls: parent.className?.toString?.().slice(0, 34) || parent.tagName,
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      color: cs.color,
    });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  return { origin: { x: r0.x, y: r0.y }, items };
};

/** 按文本内容做多重集配对（同文本取 (y,x) 序），统计命中率与偏差 */
function match(ir, dom, tol) {
  const pool = dom.map((d, i) => ({ ...d, i }));
  const hits = [], miss = [], devs = [];
  for (const e of ir) {
    const k = pool.findIndex((d) => d.text === e.text);
    if (k < 0) { miss.push(e); continue; }
    const d = pool.splice(k, 1)[0];
    const dv = { dx: d.x - e.x, dy: d.y - e.y, dw: d.w - e.w, dh: d.h - e.h };
    const worst = Math.max(...Object.values(dv).map(Math.abs));
    hits.push({ e, d, dv, worst });
    devs.push(worst);
  }
  const over = hits.filter((h) => h.worst > tol);
  devs.sort((a, b) => b - a);
  return { hits, miss, over, domLeft: pool, max: devs[0] ?? 0, p95: devs[Math.floor(devs.length * 0.05)] ?? 0 };
}

const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginRes.json();
const token = loginBody.access_token || loginBody.token;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ t, u, k }) => { localStorage.setItem(k, t); localStorage.setItem(k + "_user", JSON.stringify(u)); }, { t: token, u: loginBody.user, k: storageKey });

const TOL = Number(process.env.VISUAL_TEXT_TOL || 3);

for (const s of spec.screens) {
  if (s.type === "chrome" || s.needsReview) continue;
  const p = resolve(irDir, `${s.id}.json`);
  let ir;
  try { ir = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
  const e = irTexts(ir);
  if (!e.length) continue;

  await page.setViewportSize({ width: ir.frame?.w || 1440, height: ir.frame?.h || 1068 });
  await page.goto(`${WEB_URL}${s.route}?visualGate=1`, { waitUntil: "networkidle" });
  if (s.type === "modal") {
    try {
      await page.getByRole("button", { name: s.modal?.trigger || /新增/ }).click({ force: true });
      await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
      await page.waitForTimeout(400);
    } catch (err) { console.log(`${s.id}: 弹窗打不开 ${err.message}`); continue; }
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const dom = await page.evaluate(DOM_TEXTS, s.type === "modal" ? "modal" : "screen");
  const m = match(e, dom.items, TOL);
  console.log(`\n=== ${s.id} (${s.name}) IR-TEXT=${e.length} DOM-TEXT=${dom.items.length} 命中=${m.hits.length} 漏=${m.miss.length} DOM多=${m.domLeft.length} 超差=${m.over.length} max=${m.max}px`);
  if (m.miss.length) console.log(`  IR 未命中: ${m.miss.slice(0, 8).map((x) => JSON.stringify(x.text) + `@${x.x},${x.y}`).join(" ")}`);
  if (m.domLeft.length) console.log(`  DOM 多出: ${m.domLeft.slice(0, 8).map((x) => JSON.stringify(x.text) + `@${x.x},${x.y}`).join(" ")}`);
  if (m.over.length) {
    console.log(`  超差 ${TOL}px 的项:`);
    for (const h of m.over.slice(0, 10)) {
      console.log(`    ${JSON.stringify(h.e.text).padEnd(30)} IR ${h.e.w}x${h.e.h}@${h.e.x},${h.e.y} DOM ${h.d.w}x${h.d.h}@${h.d.x},${h.d.y} Δ${h.dv.dx},${h.dv.dy},${h.dv.dw},${h.dv.dh} [${h.d.cls} ${h.d.size}px ${h.d.color}]`);
    }
  }
}
await browser.close();
