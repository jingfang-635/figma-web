#!/usr/bin/env node
/**
 * Visual gate: Playwright screenshot vs Figma PNG.
 * SSIM >= 0.97 OR pixel mismatch < 2% required.
 *
 * Usage (repo root, with api+web running):
 *   node scripts/visual-gate.mjs
 * Env: WEB_URL (default http://localhost:5173)
 *
 * 配置来源（去硬编码）：
 * - 标杆屏与路由：fixtures/<slug>/app-spec.json → benchmarkScreens
 * - 登录凭证：env GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD 或 spec.seedAdmin
 * - localStorage key：spec.auth.storageKey（默认 auth_token）
 * - mask：fixtures/<slug>/gate-masks.json（可选）
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject, gateCredentials, gateMasks } from "./lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

function loadDep(name) {
  try {
    return require(name);
  } catch {
    console.error(`Missing ${name}. Run: npm install -D playwright pixelmatch pngjs`);
    process.exit(1);
  }
}

const { chromium } = loadDep("playwright");
const pixelmatch = loadDep("pixelmatch");
const { PNG } = loadDep("pngjs");

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const SSIM_MIN = Number(process.env.VISUAL_SSIM_MIN || 0.97);
const MISMATCH_MAX = Number(process.env.VISUAL_MISMATCH_MAX || 0.02);
const VIEWPORT = { width: 1440, height: 1068 };
const outDir = resolve(root, "artifacts/visual-diff");
mkdirSync(outDir, { recursive: true });

// —— 项目配置（app-spec 驱动，不再硬编码业务）——
const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error(
    "No project slug resolved. Run: node scripts/init-project.mjs --slug <slug> --file <fileKey>",
  );
  process.exit(1);
}
const { email, password, storageKey } = gateCredentials(root);

/** benchmarkScreens → gate targets（modal 用 spec.modal.trigger 匹配按钮） */
function gateTargets() {
  const bms = spec?.benchmarkScreens || [];
  const targets = [];
  for (const b of bms) {
    if (b.type === "chrome") continue; // chrome（侧栏）不单独跑闸门
    if (b.type === "modal") {
      targets.push({
        id: b.id,
        route: b.route,
        shot: `${b.name}.png`,
        modal: true,
        trigger: b.modal?.trigger || /新增/,
      });
      continue;
    }
    targets.push({ id: b.id, route: b.route, shot: `${b.name}.png`, modal: false });
  }
  return targets;
}

const TARGETS = gateTargets();
/** 可选 mask：{ [screenId]: [{x,y,w,h}] }，来自 gate-masks.json */
const GATE_MASKS = gateMasks(root);

function masksFor(name) {
  return [...(GATE_MASKS[name] || [])];
}

function fillRect(png, x, y, w, h, rgba = [255, 255, 255, 255]) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(png.width, x + w);
  const y1 = Math.min(png.height, y + h);
  for (let row = y0; row < y1; row++) {
    for (let col = x0; col < x1; col++) {
      const i = (row * png.width + col) * 4;
      png.data[i] = rgba[0];
      png.data[i + 1] = rgba[1];
      png.data[i + 2] = rgba[2];
      png.data[i + 3] = rgba[3];
    }
  }
}

function luma(data, i) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

function resizeGray(png, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x / w) * png.width));
      const sy = Math.min(png.height - 1, Math.floor((y / h) * png.height));
      out[y * w + x] = luma(png.data, (sy * png.width + sx) * 4);
    }
  }
  return out;
}

function ssimScore(a, b) {
  const w = 360;
  const h = Math.max(1, Math.round((360 * Math.min(a.height, b.height)) / Math.min(a.width, b.width)));
  const ga = resizeGray(a, w, h);
  const gb = resizeGray(b, w, h);
  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) ** 2;
  const C2 = (K2 * L) ** 2;
  const win = 8;
  let acc = 0;
  let n = 0;
  for (let y = 0; y <= h - win; y += 4) {
    for (let x = 0; x <= w - win; x += 4) {
      let muA = 0;
      let muB = 0;
      for (let j = 0; j < win; j++) {
        for (let i = 0; i < win; i++) {
          const idx = (y + j) * w + (x + i);
          muA += ga[idx];
          muB += gb[idx];
        }
      }
      const count = win * win;
      muA /= count;
      muB /= count;
      let varA = 0;
      let varB = 0;
      let cov = 0;
      for (let j = 0; j < win; j++) {
        for (let i = 0; i < win; i++) {
          const idx = (y + j) * w + (x + i);
          const da = ga[idx] - muA;
          const db = gb[idx] - muB;
          varA += da * da;
          varB += db * db;
          cov += da * db;
        }
      }
      varA /= count - 1;
      varB /= count - 1;
      cov /= count - 1;
      acc += ((2 * muA * muB + C1) * (2 * cov + C2)) / ((muA * muA + muB * muB + C1) * (varA + varB + C2));
      n++;
    }
  }
  return n ? acc / n : 0;
}

function fitPng(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(png.width - 1, Math.floor((x / width) * png.width));
      const sy = Math.min(png.height - 1, Math.floor((y / height) * png.height));
      const si = (sy * png.width + sx) * 4;
      const di = (y * width + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function clipPng(png, x, y, w, h) {
  const width = Math.max(1, Math.min(w, png.width - x));
  const height = Math.max(1, Math.min(h, png.height - y));
  const out = new PNG({ width, height });
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const si = ((y + row) * png.width + (x + col)) * 4;
      const di = (row * width + col) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function compare(expectedBuf, actualBuf, name) {
  let expectedPng = PNG.sync.read(expectedBuf);
  const actualRaw = PNG.sync.read(actualBuf);
    const height = Math.min(expectedPng.height, actualRaw.height, VIEWPORT.height);
  const width = Math.min(expectedPng.width, actualRaw.width, VIEWPORT.width);
  const exp = fitPng(expectedPng, width, height);
  const act = fitPng(actualRaw, width, height);
  writeFileSync(resolve(outDir, `${name}.actual.raw.png`), PNG.sync.write(act));
  const masks = masksFor(name);
  if (masks.length) {
    for (const m of masks) {
      fillRect(exp, m.x, m.y, m.w, m.h);
      fillRect(act, m.x, m.y, m.w, m.h);
    }
  }
  const diff = new PNG({ width, height });
  const threshold = 0.25;
  const mismatch = pixelmatch(exp.data, act.data, diff.data, width, height, { threshold });
  const ratio = mismatch / (width * height);
  const ssim = ssimScore(exp, act);
  writeFileSync(resolve(outDir, `${name}.expected.png`), PNG.sync.write(exp));
  writeFileSync(resolve(outDir, `${name}.actual.png`), PNG.sync.write(act));
  writeFileSync(resolve(outDir, `${name}.diff.png`), PNG.sync.write(diff));
  const pass = ssim >= SSIM_MIN || ratio < MISMATCH_MAX;
  return { name, width, height, mismatch, ratio, ssim, pass };
}

async function waitForWeb() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(WEB_URL, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Web not reachable at ${WEB_URL}. Start npm run api && npm run web first.`);
}

const shotsDir = resolve(root, "imports/figma/screens");
if (!existsSync(shotsDir)) {
  console.error("Missing imports/figma/screens. Run npm run visual:shots first.");
  process.exit(1);
}

await waitForWeb();

const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginRes.json().catch(() => ({}));
const accessToken = loginBody.access_token || loginBody.token;
if (!loginRes.ok || !accessToken) {
  console.error("API login failed", loginRes.status, loginBody);
  process.exit(1);
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(
  ({ token, user }) => {
    localStorage.setItem(storageKey, token);
    localStorage.setItem(storageKey + "_user", JSON.stringify(user));
  },
  { token: accessToken, user: loginBody.user },
);
await page.goto(`${WEB_URL}/?visualGate=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".app-sider", { timeout: 20000 });
await page.evaluate(() => document.fonts.ready);

const scores = [];
for (const t of TARGETS) {
  const refPath = resolve(shotsDir, t.shot);
  if (!existsSync(refPath)) {
    console.warn("skip missing ref", t.shot);
    scores.push({ name: t.id, pass: false, error: `missing ${t.shot}` });
    continue;
  }
  const url = `${WEB_URL}${t.route}?visualGate=1`;
  await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
  if (t.modal) {
    try {
      await page.waitForSelector(".ant-table", { timeout: 10000 });
      await page.getByRole("button", { name: t.trigger }).click({ force: true });
      await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
      await page.waitForTimeout(400);
    } catch (err) {
      console.warn("modal open failed:", err.message);
    }
  }
  await page.evaluate(() => document.fonts.ready);
  const actual = t.modal
    ? await (async () => {
        const content = page.locator(".dept-modal .ant-modal-content, .ant-modal-content").last();
        let box = (await content.count()) > 0 ? await content.boundingBox() : null;
        if (!box) box = await page.getByRole("dialog").boundingBox().catch(() => null);
        if (box) {
          const w = Math.ceil(box.width);
          const h = Math.ceil(box.height);
          const x = Math.max(0, Math.round(box.x + Math.max(0, box.width - w) / 2));
          const y = Math.max(0, Math.round(box.y));
          return page.screenshot({
            type: "png",
            clip: { x, y, width: w, height: h },
            animations: "disabled",
            caret: "hide",
          });
        }
        return page.screenshot({
          type: "png",
          clip: t.clip || { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
          animations: "disabled",
          caret: "hide",
        });
      })()
    : await page.screenshot({
        type: "png",
        clip: t.clip || { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
        animations: "disabled",
        caret: "hide",
      });
  const result = compare(readFileSync(refPath), actual, t.id);
  scores.push(result);
  console.log(
    `${t.id}: ssim=${result.ssim.toFixed(4)} mismatch=${(result.ratio * 100).toFixed(2)}% ${result.pass ? "PASS" : "FAIL"}`,
  );
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  webUrl: WEB_URL,
  ssimMin: SSIM_MIN,
  mismatchMax: MISMATCH_MAX,
  scores,
};
writeFileSync(resolve(outDir, "score.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Wrote", resolve(outDir, "score.json"));

const failed = scores.filter((s) => !s.pass);
if (failed.length) {
  console.error(`Visual gate failed: ${failed.map((f) => f.name).join(", ")}`);
  process.exit(1);
}
console.log("Visual gate passed.");
