/**
 * 共享浏览器会话（无业务语义）。
 *
 * 为什么需要：此前**每个腿部脚本各自 `chromium.launch()` + 各自登录 + 各自把全部屏导航一遍**
 * （capture / text / geom / backfill / live-data / gate-lock 共 6 次启动、约 45 次导航），
 * 而它们的 DOM 需求高度重叠。本模块把「启动 + 登录 + 打开页面」抽成一处，
 * 由一个采集趟次（collect-pass）调用一次即可覆盖全部腿部。
 *
 * 等待策略：优先 `domcontentloaded` + 显式「内容稳定」轮询，
 * 而不是 `networkidle`（后者固定多等 ~0.5–1s/屏，且在持续轮询的页面上易超时）。
 * 稳定判据是**通用**的（.app-content 的 scrollHeight + textContent 长度连续 N ms 不变），
 * 不含任何按屏 / 业务值。
 */
import { createRequire } from "node:module";

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    console.error("缺少 playwright。Run: npm i -D playwright");
    process.exit(1);
  }
}

/** 启动 Chromium：优先系统 chrome（渲染与标杆图更一致），失败回落默认。 */
export async function launchChromium(playwright) {
  try {
    return await playwright.chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    return await playwright.chromium.launch({ headless: true });
  }
}

/** 内容稳定轮询的宽限：连续若干次签名不变即视为稳定（通用值）。
 *  为什么不能太小：图表库（recharts 等）**分阶段渲染**——先画坐标轴刻度，再画数据标签/金额，
 *  两个阶段之间可能出现 >150ms 的空档；间隔太小时会在「只有刻度、没有数据标签」的中间态
 *  判定稳定 → 采到的 DOM 缺图表值（实测：首页 bodyText 222 字 vs 完整 272 字，
 *  活数据腿随即报「图表的值未出现在页面」）。 */
const STABLE_GAP_MS = 300;
const STABLE_POLL_MS = 50;

/** 网络静默宽限：请求数归零后再等这么久才算静默（通用值）。 */
const NET_QUIET_GAP_MS = 250;
/** 悬挂保护：单个请求在途超过这么久就**不再等它**（防 SSE / 长轮询把每次等待拖满 timeout）。 */
const NET_STALL_MS = 1200;

/** 在途请求计数（attach 一次，随 page 生命周期）。 */
function trackNetwork(page) {
  if (page.__net) return page.__net;
  const state = { inflight: 0, lastChange: Date.now() };
  const bump = (delta) => {
    state.inflight = Math.max(0, state.inflight + delta);
    state.lastChange = Date.now();
  };
  page.on("request", () => bump(1));
  page.on("requestfinished", () => bump(-1));
  page.on("requestfailed", () => bump(-1));
  page.__net = state;
  return state;
}

const READ_SIG = () => {
  const el = document.querySelector(".app-content") || document.body;
  return `${el.scrollHeight}:${el.textContent.length}:${el.querySelectorAll("*").length}`;
};

/** 等待页面内容稳定（判据通用，不含业务值）。
 *  签名含 **元素计数**：分阶段渲染常表现为「新增节点」而不只是文本长度变化。
 *  另外要求**网络静默**：仅看 DOM 会在「数据请求在途、图表只画了坐标轴」时误判稳定
 *  （实测该中间态可静止 400ms > 阈值），加入在途请求条件后能正确等到完整渲染。 */
export async function waitStable(page, { timeout = 10000, gapMs = STABLE_GAP_MS } = {}) {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  const net = trackNetwork(page);
  const t0 = Date.now();
  let sig = null;
  let since = t0;
  while (Date.now() - t0 < timeout) {
    const cur = await page.evaluate(READ_SIG).catch(() => null);
    if (cur === null) return; // 页面已跳走/关闭
    if (cur !== sig) {
      sig = cur;
      since = Date.now();
    }
    const now = Date.now();
    const domQuiet = now - since >= gapMs;
    const idle = now - net.lastChange;
    const netQuiet = net.inflight === 0 ? idle >= NET_QUIET_GAP_MS : idle >= NET_STALL_MS;
    if (domQuiet && netQuiet) return;
    await new Promise((r) => setTimeout(r, STABLE_POLL_MS));
  }
}

/** 渲染备用等待：侧栏出现（应用壳挂载完成的通用标志）。 */
export async function waitAppShell(page, { timeout = 10000 } = {}) {
  await page.waitForSelector(".app-sider", { timeout }).catch(() => {});
}

/**
 * 建立已登录会话：一次登录 → 注入 localStorage → 复用同一 context。
 * 返回 { browser, context, page, auth }，调用方负责 close()。
 */
export async function openSession({ playwright, webUrl, credentials, viewport }) {
  const { username, password, storageKey } = credentials;
  const loginRes = await fetch(`${webUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.access_token || loginBody.token;
  if (!loginRes.ok || !token) {
    throw new Error(`登录失败 ${loginRes.status}，请确认 api / web 已启动且 seedAdmin 有效`);
  }

  const browser = await launchChromium(playwright);
  const context = await browser.newContext(viewport ? { viewport } : {});
  const page = await context.newPage();
  await page.goto(`${webUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token: t, user, key }) => {
      localStorage.setItem(key, t);
      localStorage.setItem(`${key}_user`, JSON.stringify(user));
    },
    { token, user: loginBody.user, key: storageKey },
  );
  return { browser, context, page, auth: { token, user: loginBody.user, storageKey } };
}

/** 打开路由（gate = 冻结 Blueprint sample；live = 走真实接口）。 */
export async function openRoute(page, webUrl, route, viewport, { gate = true, timeout = 30000 } = {}) {
  if (viewport) await page.setViewportSize(viewport);
  const url = `${webUrl}${route}${gate ? "?visualGate=1" : ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout });
  await waitAppShell(page);
  await waitStable(page);
}

/** 等待元素框稳定（通用）：连续 N 次轮询宽高/位置不变 → 视为动画结束。
 *  为什么必须：antd 弹窗有 zoom-in 动画（transform scale），动画中途量 boundingBox
 *  会得到远小于真实的框（实测 520×739 的弹窗在动画早期只有 ~101×99），
 *  既污染截图 clip，也让后续所有几何/文本坐标全错。 */
export async function waitBoxStable(page, selector, { timeout = 4000, polls = 6, interval = 50 } = {}) {
  await page
    .waitForFunction(
      ({ sel, need }) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        const sig = `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}`;
        if (window.__boxSig !== sig) {
          window.__boxSig = sig;
          window.__boxSigCount = 0;
          return false;
        }
        window.__boxSigCount = (window.__boxSigCount || 0) + 1;
        return window.__boxSigCount >= need;
      },
      { sel: selector, need: polls },
      { timeout, polling: interval },
    )
    .catch(() => {});
}

/** 打开弹窗（trigger 驱动），等动画结束再返回。 */
export async function openModal(page, trigger, { timeout = 8000 } = {}) {
  await page.getByRole("button", { name: trigger }).first().click({ force: true });
  await page.getByRole("dialog").waitFor({ state: "visible", timeout });
  await waitBoxStable(page, ".ant-modal-content", { timeout });
  await waitBoxStable(page, ".ant-modal", { timeout });
}

export async function closeSession(session) {
  if (session?.browser) await session.browser.close().catch(() => {});
}
