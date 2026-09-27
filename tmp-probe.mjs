import { createRequire } from "node:module";
import { resolve } from "node:path";
import { resolveProject, gateCredentials, loadRootEnv } from "./scripts/lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const { chromium } = require("playwright");
const { email, password, storageKey } = gateCredentials(root);
const lr = await fetch(`${WEB_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const lb = await lr.json();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ t, u, k }) => {
  localStorage.setItem(k, t);
  localStorage.setItem(k + "_user", JSON.stringify(u));
}, { t: lb.access_token || lb.token, u: lb.user, k: storageKey });

const bx = (el) => {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
};

// ORG label detail
await page.goto(`${WEB_URL}/organization?visualGate=1`, { waitUntil: "networkidle" });
const org = await page.evaluate(() => {
  const label = document.querySelector(".org-form .ant-form-item-label > label");
  const wrap = document.querySelector(".org-form .ant-form-item-label");
  const star = label.querySelector(".org-req");
  const cs = getComputedStyle(label);
  const cw = getComputedStyle(wrap);
  const b = (e) => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const tn = [...label.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
  const rg = document.createRange();
  rg.selectNodeContents(tn);
  return {
    wrap: { box: b(wrap), flex: cw.flex, pr: cw.paddingRight, display: cw.display },
    label: { box: b(label), w: cs.width, pr: cs.paddingRight, justify: cs.justifyContent, display: cs.display, ta: cs.textAlign, h: cs.height, lh: cs.lineHeight, fs: cs.fontSize, pos: cs.position, ai: cs.alignItems },
    star: { box: b(star), ml: getComputedStyle(star).marginLeft, w: getComputedStyle(star).width },
    textRange: b({ getBoundingClientRect: () => rg.getBoundingClientRect() }),
    items: [...document.querySelectorAll(".org-form .ant-form-item-label > label")].map((e) => ({ box: b(e), txt: e.textContent.trim().slice(0, 8) })),
  };
});
console.log("== ORG label ==");
console.log(JSON.stringify(org, null, 2));

// DOCTORS details
await page.goto(`${WEB_URL}/doctors?visualGate=1`, { waitUntil: "networkidle" });
const doc = await page.evaluate(() => {
  const b = (e) => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const name = document.querySelector(".ant-table-tbody tr:first-child .cell-name");
  const av = name.querySelector(".cell-avatar");
  const wrap = name.querySelectorAll(":scope > span")[1];
  const thLast = document.querySelector(".ant-table-thead th:last-child");
  const tbl = document.querySelector(".ant-table");
  const search = document.querySelector(".list-toolbar input.ant-input");
  const searchWrap = document.querySelector(".list-toolbar .ant-input-affix-wrapper, .list-toolbar input.ant-input");
  return {
    table: b(tbl),
    nameBox: b(name),
    avatar: { box: b(av), mr: getComputedStyle(av).marginRight, fs: getComputedStyle(av).fontSize, color: getComputedStyle(av).color, bg: getComputedStyle(av).backgroundColor },
    second: b(wrap),
    nameGap: getComputedStyle(name).gap,
    thLast: { box: b(thLast), ta: getComputedStyle(thLast).textAlign, pr: getComputedStyle(thLast).paddingRight, pl: getComputedStyle(thLast).paddingLeft },
    thAll: [...document.querySelectorAll(".ant-table-thead th")].map((e) => ({ txt: e.textContent.trim(), box: b(e), pl: getComputedStyle(e).paddingLeft, ta: getComputedStyle(e).textAlign })),
    search: { box: b(searchWrap), fs: getComputedStyle(search).fontSize },
  };
});
console.log("== DOCTORS ==");
console.log(JSON.stringify(doc, null, 2));

// SCHEDULES details
await page.goto(`${WEB_URL}/schedules?visualGate=1`, { waitUntil: "networkidle" });
const sch = await page.evaluate(() => {
  const b = (e) => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const cnt = document.querySelector(".cell-count");
  const it = document.querySelector(".cell-item");
  const more = document.querySelector(".cell-more");
  const arrows = [...document.querySelectorAll(".month-arrow")];
  const btns = [...document.querySelectorAll(".toolbar-right .ant-btn, .toolbar-right button")];
  return {
    cellItem: { box: b(it), display: getComputedStyle(it).display, fd: getComputedStyle(it).flexDirection, gap: getComputedStyle(it).gap, ai: getComputedStyle(it).alignItems, pad: getComputedStyle(it).padding, lh: getComputedStyle(it).lineHeight },
    count: { box: b(cnt), fs: getComputedStyle(cnt).fontSize, lh: getComputedStyle(cnt).lineHeight, mt: getComputedStyle(cnt).marginTop, tag: cnt.tagName, parentCls: cnt.parentElement.className },
    more: { box: b(more), fs: getComputedStyle(more).fontSize, lh: getComputedStyle(more).lineHeight, mt: getComputedStyle(more).marginTop },
    arrows: arrows.map((a) => ({ box: b(a), html: a.outerHTML.slice(0, 120), fs: getComputedStyle(a).fontSize, lh: getComputedStyle(a).lineHeight })),
    btns: btns.map((e) => ({ box: b(e), txt: e.textContent.trim(), color: getComputedStyle(e).color, cls: e.className })),
    legend: [...document.querySelectorAll(".legend-item, .cell-legend span")].slice(0, 6).map((e) => ({ txt: e.textContent.trim(), box: b(e) })),
  };
});
console.log("== SCHEDULES ==");
console.log(JSON.stringify(sch, null, 2));

await browser.close();
