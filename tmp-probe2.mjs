import { createRequire } from "node:module";
import { resolve } from "node:path";
import { resolveProject, gateCredentials, loadRootEnv } from "./scripts/lib/project.mjs";
const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const { chromium } = require("playwright");
const { email, password, storageKey } = gateCredentials(root);
const lr = await fetch(`${WEB_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
const lb = await lr.json();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ t, u, k }) => { localStorage.setItem(k, t); localStorage.setItem(k + "_user", JSON.stringify(u)); }, { t: lb.access_token || lb.token, u: lb.user, k: storageKey });
await page.goto(`${WEB_URL}/organization?visualGate=1`, { waitUntil: "networkidle" });
const out = await page.evaluate(() => {
  const label = document.querySelector(".org-form .ant-form-item-label > label");
  const wrap = document.querySelector(".org-form .ant-form-item-label");
  const b = (e) => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), w: +r.width.toFixed(1) }; };
  const after = getComputedStyle(label, "::after");
  const before = getComputedStyle(label, "::before");
  const kids = [...label.childNodes].map((n) => {
    if (n.nodeType === 3) { const r = document.createRange(); r.selectNodeContents(n); return { type: "text", txt: n.nodeValue, ...b({ getBoundingClientRect: () => r.getBoundingClientRect() }) }; }
    return { type: "el", tag: n.tagName, cls: n.className, ...b(n) };
  });
  return {
    labelHTML: label.outerHTML.slice(0, 400),
    wrapHTML: wrap.outerHTML.slice(0, 200),
    after: { content: after.content, w: after.width, ml: after.marginLeft, mr: after.marginRight, pl: after.paddingLeft, pr: after.paddingRight, display: after.display, pos: after.position },
    before: { content: before.content, w: before.width, ml: before.marginLeft, mr: before.marginRight },
    kids,
    labelCS: { boxSizing: getComputedStyle(label).boxSizing, padding: getComputedStyle(label).padding, width: getComputedStyle(label).width, display: getComputedStyle(label).display, fd: getComputedStyle(label).flexDirection, gap: getComputedStyle(label).gap, overflow: getComputedStyle(label).overflow },
    wrapCS: { box: b(wrap), display: getComputedStyle(wrap).display, justify: getComputedStyle(wrap).justifyContent, ta: getComputedStyle(wrap).textAlign, flex: getComputedStyle(wrap).flex },
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
