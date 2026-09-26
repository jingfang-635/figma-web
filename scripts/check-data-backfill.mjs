#!/usr/bin/env node
/**
 * 数据回填闸门（非 visualGate 模式，防「标签在、数值空」假完成）
 *
 * 断言（2026-09-25 机构页事故：GET 返回数组被当单对象 setFieldsValue，表单全空）：
 *   1. seed 值存在性：spec.entities.seedRows[0] 的每个非空字段值（长度≥2）必须出现在
 *      页面 DOM 中（表单控件 value / KPI 文本 / 正文 textContent）
 *   2. 反向断言：form 屏的表单控件不允许全空（契约断裂信号——seed 有数据页面没回填）
 *
 * 机制：spec.screens 找 type=form|detail → Playwright 开真实页面（不带 visualGate）
 * → 读 DOM 实际值与 seed 逐字比对 → 有缺即 fail（exit 1）。
 *
 * Usage (repo root, with api+web running):
 *   node scripts/check-data-backfill.mjs                # 全部 form/detail 屏
 *   node scripts/check-data-backfill.mjs --screen=organization
 * Env: WEB_URL (default http://localhost:5173)
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { resolveProject, gateCredentials } from "./lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

function loadDep(name) {
  try {
    return require(name);
  } catch {
    console.error(`Missing ${name}. Run: npm install -D playwright`);
    process.exit(1);
  }
}

const { chromium } = loadDep("playwright");
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const screenArg = (process.argv.find((a) => a.startsWith("--screen=")) || "").split("=")[1];

const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error("No project slug resolved. Run init-project first.");
  process.exit(1);
}
const { username, password, storageKey } = gateCredentials(root);

// —— 目标屏：spec 里 type=form|detail 的屏（闸门全集，无业务硬编码）——
function backfillTargets() {
  const screens = spec?.screens || [];
  const entities = spec?.entities || [];
  return screens
    .filter((s) => (s.type === "form" || s.type === "detail") && s.route && !s.needsReview)
    .map((s) => {
      const entityKey = s.entity || s.resource;
      const entity = entities.find(
        (e) =>
          String(e.name).toLowerCase() === String(entityKey).toLowerCase() ||
          String(e.route || "").toLowerCase() === String(s.route).toLowerCase(),
      );
      return {
        id: s.id,
        name: s.name,
        route: s.route,
        resource: entityKey,
        seedRow: entity?.seedRows?.[0] || null,
      };
    });
}

/** seed 值 → 期望文本集合（过滤无判别力的短值：状态码/单字符/空串） */
function expectedTexts(row) {
  return Object.entries(row || {})
    .filter(([k, v]) => k !== "id" && v !== null && v !== undefined)
    .map(([, v]) => String(v).trim())
    .filter((v) => v.length >= 2 && !/^(active|open|closed|am|pm)$/i.test(v));
}

async function main() {
  const targets = backfillTargets().filter((t) => !screenArg || t.id === screenArg || t.name === screenArg);
  if (!targets.length) {
    console.log("无 form/detail 屏需要数据回填断言，跳过。");
    return;
  }

  const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.access_token || loginBody.token;
  if (!loginRes.ok || !token) {
    console.error(`登录失败 ${loginRes.status}，请确认 api(3001)/web(5173) 已启动且 seedAdmin 有效`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1068 } });
  await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, user, storageKey }) => {
      localStorage.setItem(storageKey, token);
      localStorage.setItem(storageKey + "_user", JSON.stringify(user));
    },
    { token, user: loginBody.user, storageKey },
  );

  console.log(`📋 数据回填断言（非 gate 模式，DOM 实测 vs seed）— ${targets.length} 屏\n`);
  let failed = 0;
  const results = [];

  for (const t of targets) {
    const expects = t.seedRow ? expectedTexts(t.seedRow) : null;
    if (!expects || !expects.length) {
      console.log(`⚠️  ${t.name}: spec.entities 缺 ${t.resource} 的 seedRows，无法断言（建议补 spec）`);
      continue;
    }
    try {
      await page.goto(`${WEB_URL}${t.route}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(800); // 等接口回填
      await page.evaluate(() => document.fonts.ready);

      const dom = await page.evaluate(() => {
        const formVals = {};
        document.querySelectorAll(".ant-form-item").forEach((item) => {
          const label = item.querySelector(".ant-form-item-label label")?.textContent?.replace("*", "").trim();
          const ctrl = item.querySelector("input, textarea");
          if (label && ctrl) formVals[label] = ctrl.value ?? "";
        });
        const kpis = {};
        document.querySelectorAll(".kpi-card").forEach((c) => {
          kpis[c.querySelector(".kpi-label")?.textContent?.trim() || ""] =
            c.querySelector(".kpi-value")?.textContent?.trim() || "";
        });
        return {
          formVals,
          kpis,
          bodyText: document.querySelector(".app-content")?.textContent || document.body.textContent || "",
        };
      });

      const misses = [];
      // 断言 1：每个 seed 非空值必须能在 DOM 中找到
      for (const expect of expects) {
        const inForm = Object.values(dom.formVals).some((v) => v === expect);
        const inKpi = Object.values(dom.kpis).some((v) => v === expect);
        const inBody = dom.bodyText.includes(expect);
        if (!inForm && !inKpi && !inBody) misses.push(expect);
      }
      // 断言 2：表单控件不允许全空（seed 有数据而页面没回填 = 取数契约断裂）
      const formValues = Object.values(dom.formVals);
      if (formValues.length > 0 && formValues.every((v) => !v)) {
        misses.push("<整体：表单控件全空，取数契约断裂>");
      }

      if (misses.length) {
        failed++;
        console.log(`❌ ${t.name} (${t.route})`);
        for (const m of misses) console.log(`   · 页面中未找到 seed 值「${m}」`);
      } else {
        console.log(`✅ ${t.name} (${t.route}) — ${formValues.length} 字段 + ${Object.keys(dom.kpis).length} KPI，seed 值全部可见`);
      }
      results.push({ screen: t.name, route: t.route, ok: !misses.length, misses });
    } catch (err) {
      failed++;
      console.log(`❌ ${t.name}: ${err.message}`);
      results.push({ screen: t.name, route: t.route, ok: false, error: err.message });
    }
  }

  await browser.close();
  writeFileSync(
    resolve(root, "artifacts/visual-diff/data-backfill.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`\n${failed ? `❌ 数据回填断言失败：${failed} 屏` : "✅ 全部 form/detail 屏数据回填一致"}`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});