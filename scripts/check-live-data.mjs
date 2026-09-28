#!/usr/bin/env node
/**
 * 活数据闸门（非 visualGate 模式）：防「有数据不展示 / 展示的是假数据」再复发
 *
 * 事故背景：统计屏 KPI 与折线全为 0、柱图退化成等值占位；列表屏关联列整列为空；
 *   日历屏格子里只有日期、没有关联名称。根因三层：① 时间窗口类种子用**绝对历史日期**
 *   写死 → 窗口聚合（本月 / 近 N 天 / 今日）命中 0 行；② CRUD 映射层只映射实体自身列，
 *   **没按 spec 的 relations 做计数 / 关联取值** → 字段在响应里根本不存在；③ 前端用样例
 *   常量 + 合并兜底 → 缺陷表现为「假数据」而非空白。
 *   而像素三腿 + 几何腿 + 文本腿全 PASS —— 它们都是 gate 模式（冻结 Blueprint sample）下的
 *   「实现 vs IR」判据，与真实接口/数据库无关 → 真数据链路断了可以永远绿灯。
 *
 * 本闸门在**非 gate**（真实接口）下断言，判据全部来自 spec（无按屏配置、无业务硬编码）：
 *   A. API 聚合非空：spec.dashboard.charts 每条序列 labels/values 等长、求和 > 0、
 *      且不得所有值相同（全等 = 均分/占位信号的假数据）
 *   B. 派生字段（spec.relations）：
 *      - count：源列表每行该字段都是数，且 Σ 该字段 === 目标列表行数（漏 join 立即暴露）
 *      - lookup：源行外键非空则该字段必须非空，且必须等于目标行对应值
 *   C. DOM 渲染：spec.screens 里带 route 的屏打开后，
 *      - dashboard 屏：每条图表的每个值、每个 KPI 值必须出现在页面文本里
 *      - list 屏：每个 API 行的派生字段值必须出现在「含该行其他判别文本」的那一行里
 *      - 其余（如日历屏）：该实体 lookup 派生字段至少有一个值出现在页面文本里
 *
 * Usage（仓库根，api + web 已启动）：node scripts/check-live-data.mjs
 * Env: WEB_URL（web 地址）
 */
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { resolveProject, gateCredentials } from "./lib/project.mjs";
import { loadSnapshot } from "./lib/snapshot.mjs";

const root = resolve(process.cwd());
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";

const { slug, spec } = resolveProject(root);
if (!slug) {
  console.error("No project slug resolved. Run init-project first.");
  process.exit(1);
}
const { username, password, storageKey } = gateCredentials(root);

const relations = spec.relations || [];
const dash = spec.dashboard || {};
const chartSpecs = dash.charts || [];
const entities = spec.entities || [];
const entityOf = (name) => entities.find((e) => e.name === String(name));
const routeOf = (name) => entityOf(name)?.route;

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);
const norm = (s) => String(s ?? "").replace(/\s+/g, "");

async function main() {
  // —— 登录取 token ——
  const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token = loginBody.access_token || loginBody.token;
  if (!loginRes.ok || !token) {
    console.error(`登录失败 ${loginRes.status}，请确认 api/web 已启动且 seedAdmin 有效`);
    process.exit(1);
  }
  const apiGet = async (path) => {
    const r = await fetch(`${WEB_URL}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`GET /api${path} → ${r.status}`);
    return r.json();
  };

  console.log(`📋 活数据闸门（非 gate，真实接口 + DOM）— ${slug}\n`);

  // ══ A. 图表序列非空、非平坦 ══
  const chartsResp = await apiGet("/dashboard/charts");
  for (const ch of chartSpecs) {
    const series = chartsResp?.[ch.key];
    if (!series || !Array.isArray(series.values) || !Array.isArray(series.labels)) {
      fail(`图表 ${ch.key}：响应缺 labels/values`);
      continue;
    }
    const vals = series.values.map(Number);
    if (series.labels.length !== vals.length || !vals.length) {
      fail(`图表 ${ch.key}：labels/values 长度不一致或为空`);
      continue;
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum <= 0) fail(`图表 ${ch.key}：全 0（窗口里没有数据 → 页面必然空图）`);
    else if (new Set(vals).size < 2) fail(`图表 ${ch.key}：所有值相同（${vals[0]}）= 均分/占位信号`);
    else notes.push(`图表 ${ch.key}: ${vals.join("/")}`);
  }

  // ══ B. 派生字段（relations）══
  const lists = {};
  for (const e of entities) {
    if (!e.route) continue;
    try {
      lists[e.name] = await apiGet(`/${e.route}`);
    } catch (err) {
      fail(`列表 ${e.name}：${err.message}`);
    }
  }
  for (const rel of relations) {
    const srcName = String(rel.entity);
    const tgtName = String(rel.target);
    const srcList = lists[srcName];
    const tgtList = lists[tgtName];
    if (!Array.isArray(srcList) || !Array.isArray(tgtList)) continue;
    const values = srcList.map((r) => r[rel.field]);
    if (rel.kind === "count") {
      const numeric = values.every((v) => typeof v === "number" || /^\d+$/.test(String(v)));
      if (!numeric) {
        fail(`${srcName}.${rel.field}（count）：存在非数值/缺失值 → ${JSON.stringify(values.slice(0, 6))}`);
      } else {
        const sum = values.reduce((a, v) => a + Number(v), 0);
        if (sum !== tgtList.length) {
          fail(`${srcName}.${rel.field} 合计 ${sum} ≠ ${tgtName} 行数 ${tgtList.length}（关联漏算/漏 join）`);
        } else {
          notes.push(`${srcName}.${rel.field}: ${values.join("/")}（合计 = ${tgtName} ${tgtList.length} 行）`);
        }
      }
    } else if (rel.kind === "lookup") {
      let bad = 0;
      let mismatched = 0;
      for (const row of srcList) {
        const fk = row[rel.sourceField];
        if (fk === null || fk === undefined || String(fk) === "") continue;
        const v = row[rel.field];
        if (v === null || v === undefined || String(v).trim() === "") bad++;
        const tgt = tgtList.find((t) => String(t[rel.targetField]) === String(fk));
        if (tgt && String(tgt[rel.valueField]) !== String(v)) mismatched++;
      }
      if (bad) fail(`${srcName}.${rel.field}（lookup）：${bad} 行外键非空但派生值空（未做关联）`);
      if (mismatched) fail(`${srcName}.${rel.field}（lookup）：${mismatched} 行与 ${tgtName} 对应值不一致`);
      if (!bad && !mismatched) {
        notes.push(`${srcName}.${rel.field}: ${[...new Set(values)].slice(0, 6).join("/")}…`);
      }
    }
  }

  // ══ C. DOM 渲染（非 gate；数据取自统一采集趟次的「live 档」）══
  const statsResp = await apiGet("/dashboard/stats");
  const snap = loadSnapshot({ root, slug, leg: "活数据闸门" });

  const screens = (spec.screens || []).filter((s) => s.route && !s.modal && s.type !== "chrome");
  for (const scr of screens) {
    const route = scr.route;
    const live = snap.live?.[scr.id];
    if (!live) {
      fail(`${scr.name}（${route}）：DOM 快照缺该屏的 live 采集（重跑 npm run visual:capture）`);
      continue;
    }
    const body = norm(live.bodyText);
    const domRows = live.tableRows || [];

    if (scr.type === "dashboard") {
      for (const [k, v] of Object.entries(statsResp || {})) {
        if (!norm(v)) continue;
        if (!body.includes(norm(v))) fail(`首页 KPI「${k}」的值 ${JSON.stringify(String(v))} 未出现在页面（标签在、数值空）`);
      }
      for (const ch of chartSpecs) {
        const vals = (chartsResp?.[ch.key]?.values || []).map(Number);
        for (const v of vals) {
          if (!body.includes(String(v))) fail(`首页图表 ${ch.key} 的值 ${v} 未出现在页面（图表无数据）`);
        }
      }
      continue;
    }

    const entityName = entityOf(scr.entity)?.name || String(scr.entity || "");
    const entity = entities.find((e) => e.name === entityName || e.route === scr.entity);
    const rows = entity ? lists[entity.name] : null;
    const derivedFields = relations.filter((r) => r.entity === entity?.name);

    if (scr.type === "list" && Array.isArray(rows) && derivedFields.length) {
      if (!domRows.length) {
        fail(`${scr.name}（${route}）：表格无数据行`);
        continue;
      }
      let unmatched = 0;
      for (const row of rows.slice(0, 20)) {
        const anchors = Object.entries(row)
          .filter(([k, v]) => k !== "id" && !derivedFields.some((r) => r.field === k))
          .map(([, v]) => norm(v))
          .filter((v) => v.length >= 2);
        const domRow = domRows.find((t) => anchors.some((a) => t.includes(a)));
        if (!domRow) {
          unmatched++;
          continue;
        }
        for (const rel of derivedFields) {
          const v = norm(row[rel.field]);
          if (v && !domRow.includes(v)) {
            fail(`${scr.name}（${route}）：某行的 ${rel.field} = ${row[rel.field]} 未渲染进该行`);
          }
        }
      }
      if (unmatched) fail(`${scr.name}（${route}）：${unmatched} 行 API 数据在表格里找不到对应行`);
      continue;
    }

    // 非表格（如日历）：lookup 派生字段至少要有一个值落到页面上
    for (const rel of derivedFields.filter((r) => r.kind === "lookup")) {
      const vals = (rows || []).map((r) => norm(r[rel.field])).filter(Boolean);
      if (vals.length && !vals.some((v) => body.includes(v))) {
        fail(`${scr.name}（${route}）：${rel.field} 的任何一个值都没落到页面上（页面无数据）`);
      }
    }
  }

  writeFileSync(
    resolve(root, "artifacts/visual-diff/live-data.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), failures, notes }, null, 2),
  );

  for (const n of notes) console.log(`✅ ${n}`);
  console.log("");
  if (failures.length) {
    for (const f of failures) console.error(`❌ ${f}`);
    console.error(`\n❌ 活数据闸门失败：${failures.length} 项`);
    process.exitCode = 1;
    return;
  }
  console.log("✅ 活数据闸门通过（聚合非空、派生字段一致、页面确实渲染了这些值）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
