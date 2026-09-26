import { createRequire } from "node:module";
import { resolve } from "node:path";
import { gateCredentials, loadRootEnv } from "./scripts/lib/project.mjs";
const require = createRequire(import.meta.url);
const root = resolve(process.cwd());
loadRootEnv(root);
const { chromium } = require("playwright");
const { email, password, storageKey } = gateCredentials(root);
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const lr = await fetch(`${WEB_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
const lb = await lr.json();
const token = lb.access_token || lb.token;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ t, u, k }) => { localStorage.setItem(k, t); localStorage.setItem(k + "_user", JSON.stringify(u)); }, { t: token, u: lb.user, k: storageKey });
await page.goto(`${WEB_URL}/schedules?visualGate=1`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /批量排班/ }).click({ force: true });
await page.getByRole("dialog").waitFor({ state: "visible" });
await page.waitForTimeout(400);
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const mc = document.querySelector(".ant-modal-content");
  const o = mc.getBoundingClientRect();
  const res = [];
  mc.querySelectorAll(".ant-form-item").forEach((it) => {
    const lab = it.querySelector(".ant-form-item-label > label");
    if (!lab) return;
    const wrap = it.querySelector(".ant-form-item-label");
    const after = getComputedStyle(lab, "::after");
    const r = lab.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(lab);
    const tr = range.getBoundingClientRect();
    res.push({
      t: lab.textContent,
      wrap: [+(w.x - o.x).toFixed(1), +w.width.toFixed(1)],
      wrapPad: getComputedStyle(wrap).padding,
      label: [+(r.x - o.x).toFixed(1), +r.width.toFixed(1)],
      labelPad: getComputedStyle(lab).padding,
      labelAlign: getComputedStyle(wrap).textAlign,
      textBox: [+(tr.x - o.x).toFixed(1), +tr.width.toFixed(1)],
      after: `content=${after.content} w=${after.width} ml=${after.marginLeft} mr=${after.marginRight}`,
    });
  });
  return res;
});
for (const r of out) console.log(`${r.t.padEnd(10)} wrap ${r.wrap[0]}+${r.wrap[1]} pad[${r.wrapPad}] align=${r.labelAlign} | label ${r.label[0]}+${r.label[1]} pad[${r.labelPad}] | text ${r.textBox[0]}+${r.textBox[1]} | ::after[${r.after}]`);
await browser.close();
