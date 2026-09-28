#!/usr/bin/env node
/**
 * 数据回填闸门（非 visualGate 模式，防「标签在、数值空」假完成）
 *
 * 断言（2026-09-25 机构页事故：GET 返回数组被当单对象 setFieldsValue，表单全空）：
 *   1. seed 值存在性：spec.entities.seedRows[0] 的每个非空字段值（长度≥2）必须出现在
 *      页面 DOM 中（表单控件 value / KPI 文本 / 正文 textContent）
 *   2. 反向断言：form 屏的表单控件不允许全空（契约断裂信号——seed 有数据页面没回填）
 *
 * 机制：spec.screens 找 type=form|detail → 读统一采集趟次落下的 DOM 快照
 * （npm run visual:capture 的非 gate「live 档」）→ 与 seed 逐字比对 → 有缺即 fail（exit 1）。
 * 本腿不再自己开浏览器：采集与断言解耦，避免每条腿重复导航同一批屏
 * （快照新鲜度由 lib/snapshot.mjs 校验）。
 *
 * Usage (repo root, with api+web running):
 *   node scripts/check-data-backfill.mjs                # 全部 form/detail 屏
 *   node scripts/check-data-backfill.mjs --screen=<spec.screens[].id>
 * Env: WEB_URL (default http://localhost:5173)
 */
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { resolveProject } from "./lib/project.mjs";
import { loadSnapshot } from "./lib/snapshot.mjs";

const root = resolve(process.cwd());
const screenArg = (process.argv.find((a) => a.startsWith("--screen=")) || "").split("=")[1];

const { slug, spec } = resolveProject(root);

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

  const snap = loadSnapshot({ root, slug, leg: "数据回填闸门" });

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
      const dom = snap.live?.[t.id];
      if (!dom) throw new Error("快照缺少该屏的 live 采集（重跑 npm run visual:capture）");

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