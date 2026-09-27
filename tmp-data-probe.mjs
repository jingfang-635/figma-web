import { chromium } from "playwright";
import { resolveProject, gateCredentials, loadRootEnv } from "./scripts/lib/project.mjs";

const root = "e:\\AItest\\figma-web-repo";
loadRootEnv(root);
const creds = gateCredentials(root);
const WEB = process.env.WEB_URL || "http://localhost:5173";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const res = await fetch(`${WEB}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: creds.username, password: creds.password }),
});
const { token, user } = await res.json();
await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(([t, u, k]) => {
  localStorage.setItem(k, t);
  localStorage.setItem(`${k}_user`, JSON.stringify(u));
}, [token, user, creds.storageKey]);

// —— 科室管理：每行单元格文本 ——
await page.goto(`${WEB}/departments`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const deptRows = await page.$$eval(".ant-table-tbody tr.ant-table-row", (trs) =>
  trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim())),
);
console.log("=== /departments 行 ===");
deptRows.forEach((r, i) => console.log(`row${i + 1}: ${JSON.stringify(r)}`));
const deptKpi = await page.$$eval(".kpi-card", (cs) => cs.map((c) => c.innerText.replace(/\s+/g, " ").trim()));
console.log("KPI:", JSON.stringify(deptKpi));

// —— 首页：KPI + 图表 data 是否为空 ——
await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const homeKpi = await page.$$eval(".kpi-card", (cs) => cs.map((c) => c.innerText.replace(/\s+/g, " ").trim()));
console.log("\n=== / KPI ===", JSON.stringify(homeKpi));
const svgText = await page.$$eval("svg text", (ts) => ts.map((t) => t.textContent.trim()).filter(Boolean));
console.log("首页 svg text 样本:", JSON.stringify(svgText.slice(0, 40)));

// —— 排班管理：格子文本 ——
await page.goto(`${WEB}/schedules`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const cells = await page.$$eval(".cell-doctor, .cell-count, .cell-day", (ns) =>
  ns.slice(0, 30).map((n) => ({ cls: n.className, t: n.innerText.replace(/\s+/g, " ").trim() })),
);
console.log("\n=== /schedules 角标节点 ===");
cells.forEach((c) => console.log(`${c.cls}: «${c.t}»`));

await browser.close();
