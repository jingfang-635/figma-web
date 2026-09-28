#!/usr/bin/env node
/**
 * 视觉工具链 pre-flight 自检：还原轮次/闸门启动前 5 秒跑完，
 * 避免「跑起来才修工具」（依赖缺失、服务未启动、凭证失效、参考图缺失…）。
 *
 * 用法：
 *   node scripts/visual-doctor.mjs            # 全量检查（含浏览器启动）
 *   node scripts/visual-doctor.mjs --quick    # 跳过浏览器启动检查
 *
 * 全部通过 exit 0；任一失败 exit 1（打印 ❌ 清单）。
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.mjs";
import { resolveProject, gateCredentials, gateMasks } from "./lib/project.mjs";
import { flatBgDrift, FLATBG_DEFAULTS } from "./lib/pixel-metrics.mjs";
import { loadTargets } from "./check-geometry.mjs";
import { loadTargets as loadTextTargets } from "./check-text.mjs";
import { scanDocs, sampleLiterals } from "./check-doc-hardcode.mjs";

const root = resolve(process.cwd());
loadEnv(resolve(root, ".env"));

const require = createRequire(import.meta.url);
const quick = process.argv.includes("--quick");
const WEB_URL = process.env.WEB_URL || "http://localhost:5173";

const results = [];
function check(name, fn) {
  return fn().then(
    (info) => results.push({ name, ok: true, info: info || "" }),
    (err) => results.push({ name, ok: false, info: String(err?.message || err) }),
  );
}
function checkSync(name, fn) {
  try {
    const info = fn();
    results.push({ name, ok: true, info: info || "" });
  } catch (err) {
    results.push({ name, ok: false, info: String(err?.message || err) });
  }
}

// 1. App Spec（单一来源）
checkSync("app-spec 解析", () => {
  const { slug, spec } = resolveProject(root);
  if (!slug) throw new Error("未找到 fixtures/<slug>/app-spec.json，先跑 init:project");
  const bms = spec?.screens?.filter((s) => s.type !== "chrome").length || 0;
  return `slug=${slug} screens(非chrome)=${bms}`;
});

// 1b. 流程文档零硬编码（流程文档自身不得复述业务标识 / 设计几何 / 凭证——
//     否则后续 agent 会把它当模板复制进新项目，文档就从「规范」退化成了「硬编码分发器」。
//     判据见 scripts/check-doc-hardcode.mjs：结构字面量 + 从 app-spec 派生的业务字面量。）
checkSync("流程文档零硬编码", () => {
  const { files, violations, literals } = scanDocs(root);
  if (violations.length) {
    const head = violations
      .slice(0, 5)
      .map((v) => `${v.file}:${v.line} [${v.rule}] «${v.token}»`)
      .join("; ");
    throw new Error(
      `${violations.length} 处命中（${head}${violations.length > 5 ? " …" : ""}）— 跑 npm run docs:lint 看全部`,
    );
  }
  return `${files.length} 个文档干净（结构字面量 + ${literals.length} 条业务字面量判据）`;
});

// 1c. 页面层零硬编码（页面/组件只允许「消费生成物」：
//     色值 → generated/tokens（IR 派生）；冻结样本 → spec → screenConfigs[].sample；
//     屏名/品牌/侧栏文案 → generated/screenConfigs（Layout IR + app-spec 派生）。
//     这三条正是「页面自带副本」事故的入口——写完 CSS/常量不是证据，生成物才是。）
checkSync("页面层零硬编码", () => {
  const { spec } = resolveProject(root);
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  for (const d of ["apps/web/src/pages", "apps/web/src/components"]) walk(resolve(root, d));
  if (!files.length) throw new Error("未找到页面/组件源文件 —— 判据已失明");

  // 侧栏条目标签取自页面实际消费的那份生成物（chrome.sidebar → sidebarItems）
  const irPath = resolve(root, "apps/web/src/generated/visual-ir.json");
  const sidebarLabels = existsSync(irPath)
    ? ((JSON.parse(readFileSync(irPath, "utf-8")).chrome?.sidebar?.groups || []).flatMap(
        (g) => g.items || [],
      ))
    : [];

  const literals = [
    ...new Set(
      [
        ...sampleLiterals(spec),
        // chrome（sidebar/header 等）名是结构件标识，会与 `sidebarItems` 之类的标识符撞车 → 排除
        ...(spec?.screens || []).filter((s) => s?.type !== "chrome").map((s) => s?.name),
        spec?.brand?.title,
        spec?.brand?.subtitle,
        ...sidebarLabels,
      ].filter((t) => typeof t === "string" && t.trim().length >= 3),
    ),
  ];
  if (!literals.length) throw new Error("未派生出任何文案判据 —— 判据已失明");

  const hits = [];
  const push = (f, i, rule, token) =>
    hits.push(`${relative(root, f).replace(/\\/g, "/")}:${i + 1} [${rule}] «${token}»`);

  for (const f of files) {
    const lines = readFileSync(f, "utf-8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const hex = line.match(/#[0-9a-fA-F]{3,8}\b/);
      if (hex) push(f, i, "色值字面量", hex[0]);
      const byName = line.match(/screenConfigs\.find\(\s*\(?\w+\)?\s*=>\s*\w+\.name\s*===\s*['"]/);
      if (byName) push(f, i, "按屏名取配置", byName[0]);
      for (const s of literals) if (line.includes(s)) push(f, i, "文案副本", s);
    });
  }

  if (hits.length) {
    const head = hits.slice(0, 5).join("; ");
    throw new Error(
      `${hits.length} 处命中（${head}${hits.length > 5 ? " …" : ""}）— 色值/文案一律从生成物取`,
    );
  }
  return `${files.length} 个页面/组件文件干净（${literals.length} 条文案判据 + 色值 + 屏名查找）`;
});

// 2. 依赖可加载
checkSync("依赖（playwright/pixelmatch/pngjs/ssim.js）", () => {
  const missing = [];
  for (const dep of ["playwright", "pixelmatch", "pngjs", "ssim.js"]) {
    try {
      require(dep);
    } catch {
      missing.push(dep);
    }
  }
  if (missing.length) throw new Error(`npm i -D ${missing.join(" ")}`);
  return "playwright / pixelmatch / pngjs / ssim.js";
});

// 3. 闸门凭证
checkSync("闸门凭证", () => {
  const { email, storageKey } = gateCredentials(root);
  return `email=${email} storageKey=${storageKey}`;
});

// 4. Web 可达
await check("Web 可达", async () => {
  const res = await fetch(WEB_URL).catch((e) => {
    throw new Error(`${WEB_URL} 不可达（先 npm run web）: ${e.cause?.code || e.message}`);
  });
  if (!res.ok && res.status !== 404) throw new Error(`${WEB_URL} HTTP ${res.status}`);
  return WEB_URL;
});

// 5. API 登录（走 Vite 代理，与闸门同路径）
await check("API 登录", async () => {
  const { email, password } = gateCredentials(root);
  const res = await fetch(`${WEB_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch((e) => {
    throw new Error(`登录请求失败: ${e.cause?.code || e.message}`);
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}（账号/seed 是否就绪？）`);
  const body = await res.json().catch(() => ({}));
  if (!body.access_token && !body.token) throw new Error("响应无 access_token/token");
  return "login 200 + token";
});

// 6. Figma 参考截图齐全
checkSync("Figma 参考截图", () => {
  const { spec } = resolveProject(root);
  const dir = resolve(root, "imports/figma/screens");
  if (!existsSync(dir)) throw new Error("缺 imports/figma/screens，先跑 visual:shots");
  const files = new Set(readdirSync(dir));
  const missing = [];
  for (const s of spec?.screens || []) {
    if (s.type === "chrome") continue;
    if (!files.has(`${s.name}.png`)) missing.push(`${s.name}.png`);
  }
  if (missing.length) throw new Error(`缺 ${missing.join(", ")}，重跑 visual:shots`);
  return `${(spec?.screens || []).filter((s) => s.type !== "chrome").length} 张齐全`;
});

// 6b. Layout IR 完整性（2026-09-25 事故：schedules 屏 IR 缺失，页面凭感觉手写，
//     SSIM 只剩 0.5x。IR 缺失的屏必须在进还原轮次/闸门前补齐。）
checkSync("Layout IR 完整性", () => {
  const { slug, spec } = resolveProject(root);
  const irDir = resolve(root, "fixtures", slug || "", "layout-ir");
  if (!existsSync(resolve(irDir, "index.json"))) {
    throw new Error("缺 layout-ir/index.json，先跑 npm run visual:layout");
  }
  const index = JSON.parse(readFileSync(resolve(irDir, "index.json"), "utf-8"));
  const irScreens = new Set((index.frames || []).map((f) => f.id));
  const business = (spec?.screens || []).filter((s) => s.type !== "chrome" && !s.needsReview);
  const missing = business.filter((s) => !irScreens.has(s.id));
  // modal 屏不单独出 IR（其几何随宿主屏抽取），只查非 modal 屏
  const missingScreens = missing.filter((s) => s.type !== "modal");
  if (missingScreens.length) {
    throw new Error(
      `IR 缺屏: ${missingScreens.map((s) => s.id).join(", ")} — 重跑 npm run visual:layout 并确认无 Missing frames 警告`,
    );
  }
  // IR 退化检测：有文件但无 tree（region=0、tree 空 → codegen 无几何可用）
  const degraded = business
    .filter((s) => s.type !== "modal" && irScreens.has(s.id))
    .filter((s) => {
      try {
        const ir = JSON.parse(readFileSync(resolve(irDir, `${s.id}.json`), "utf-8"));
        return !ir.tree || !ir.texts || ir.texts.length === 0;
      } catch {
        return true;
      }
    });
  if (degraded.length) {
    throw new Error(`IR 退化（无 tree/texts）: ${degraded.map((s) => s.id).join(", ")} — 重跑 npm run visual:layout`);
  }
  return `${business.filter((s) => s.type !== "modal").length} 屏 IR 齐全`;
});

// 6c. 弹窗闸门覆盖（2026-09-25 弹窗事故：capture/compare 链路只截路由页，
//     4 个 modal 屏从未进对比，vertical 布局偏差直到人工看图才暴露。
//     modal 屏必须有 trigger，且截图/闸门脚本按 trigger 打开弹窗再截 .ant-modal-content。）
checkSync("弹窗闸门覆盖", () => {
  const { spec } = resolveProject(root);
  const modals = (spec?.screens || []).filter((s) => s.type === "modal");
  const noTrigger = modals.filter((m) => !m.modal?.trigger);
  if (modals.length && noTrigger.length) {
    throw new Error(
      `modal 屏缺 trigger（截图脚本无法打开弹窗）: ${noTrigger.map((m) => m.id).join(", ")} — 在 app-spec.json 补 modal.trigger`,
    );
  }
  if (!modals.length) return "无 modal 屏";
  return `${modals.length} 个 modal 屏均有 trigger（capture/gate 按 trigger 打开截 .ant-modal-content）`;
});

// 6d. 低对比度盲区闸门（2026-09-26「关键指标」事故：白卡吞白格。pixelmatch 的
//     threshold=0.25 对 #FFFFFF vs #F5F7FA（≈3.9% 色差）结构性失明，SSIM 又被整屏稀释，
//     两条腿都没拦住。新增 flatBgDrift 腿后，必须确认它在 .env 里被真正配置——
//     阈值缺失就静默回落代码默认值 = 闸门再次失明（2026-09-26 另一事故：SSIM 阈值
//     未加载，.env 写 0.85 实跑 0.55）。
checkSync("低对比度盲区闸门（flatBg）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（阈值必须从根 .env 经 loadRootEnv 读入）");
  const raw = readFileSync(p, "utf-8");
  const keys = ["VISUAL_SSIM_MIN", "VISUAL_MISMATCH_MAX", "VISUAL_FLATBG_MAX", "VISUAL_FLATBG_MODAL_MAX"];
  const missing = keys.filter((k) => !new RegExp(`^${k}=`, "m").test(raw));
  if (missing.length) {
    throw new Error(`.env 缺阈值 ${missing.join(", ")} — 闸门会静默回落代码默认值（可能更松）`);
  }
  if (typeof flatBgDrift !== "function" || !FLATBG_DEFAULTS?.rad) {
    throw new Error("lib/pixel-metrics.mjs 异常（flatBgDrift/FLATBG_DEFAULTS 不可用）");
  }
  const val = (k) => (raw.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
  return `flatBg 漂移 ≤ ${val("VISUAL_FLATBG_MAX")}（弹窗 ≤ ${val("VISUAL_FLATBG_MODAL_MAX")}），参数 rad=${FLATBG_DEFAULTS.rad} flatTol=${FLATBG_DEFAULTS.flatTol} driftTol=${FLATBG_DEFAULTS.driftTol}`;
});

// 6e. 几何闸门（像素三腿全过、页面却比原型窄一截的事故根因：
//     像素统计量对「尺寸/位置」偏差结构性失明 → 必须另有一条几何腿：
//     Layout IR 控件框 ↔ 运行时 DOM 框，逐框断言 x/y/w/h。判据从 IR 派生，无业务硬编码。
//     本项同时是「判据未失明」自检——form 屏存在却解析不出控件框 = 判据坏了。）
checkSync("几何闸门（IR↔DOM 控件框）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（VISUAL_GEO_TOL 必须从根 .env 读入，否则静默回落代码默认值）");
  const raw = readFileSync(p, "utf-8");
  if (!/^VISUAL_GEO_TOL=/m.test(raw)) {
    throw new Error(".env 缺 VISUAL_GEO_TOL — 几何闸门容差会静默回落");
  }
  const tol = (raw.match(/^VISUAL_GEO_TOL=(.*)$/m) || [])[1]?.trim();
  if (!existsSync(resolve(root, "scripts/check-geometry.mjs"))) {
    throw new Error("缺 scripts/check-geometry.mjs（npm run visual:geom 会失败）");
  }
  const { spec } = resolveProject(root);
  const targets = loadTargets();
  const boxes = targets.reduce((n, t) => n + t.boxes.length, 0);
  const hasForm = (spec?.screens || []).some((s) => s.type === "form" && !s.needsReview);
  if (!targets.length && hasForm) {
    throw new Error(
      "存在 form 屏却未从 IR 解析出任何控件框 —— 判据可能已失明（查 layout-ir 里的描边 rect 是否还在）",
    );
  }
  return targets.length
    ? `${targets.length} 屏 / ${boxes} 个控件框待断言（容差 ${tol}px）：${targets.map((t) => t.id).join(", ")}`
    : "无含控件框的屏（本屏组无输入控件，几何腿空转）";
});

// 6f. 文本闸门（2026-09-26 弹窗文本事故：4 个弹窗过了像素闸门，但 label 左偏 8px、
//     控件值 14px/字号、占位符灰 vs 深色、多一个 antd 默认冒号、* 该掉行却左溢出。
//     像素腿全是全屏统计量（文本 ink 占弹窗 40 万像素的极小比例，threshold=0.25 看不见）；
//     几何腿只认「带 stroke 的 RECTANGLE」，TEXT 节点不是 rect → 弹窗文本零覆盖。
//     故补文本腿：IR TEXT ↔ DOM 文本盒（逐节点断言位置/字号/颜色）。
//     本项同时是「判据未失明」自检——IR 有 TEXT 节点却解析不出待断言项 = 判据坏了。）
checkSync("文本闸门（IR TEXT ↔ DOM 文本盒）", () => {
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（VISUAL_TEXT_TOL 必须从根 .env 读入，否则静默回落代码默认值）");
  const raw = readFileSync(p, "utf-8");
  for (const k of ["VISUAL_TEXT_TOL", "VISUAL_TEXT_SIZE_TOL"]) {
    if (!new RegExp(`^${k}=`, "m").test(raw)) {
      throw new Error(`.env 缺 ${k} — 文本闸门容差会静默回落`);
    }
  }
  if (!existsSync(resolve(root, "scripts/check-text.mjs"))) {
    throw new Error("缺 scripts/check-text.mjs（npm run visual:text 会失败）");
  }
  const targets = loadTextTargets();
  const nodes = targets.reduce((n, t) => n + t.texts.length, 0);
  const hasScreens = (resolveProject(root).spec?.screens || []).some((s) => !s.needsReview && s.route);
  if (!targets.length && hasScreens) {
    throw new Error("有屏却未从 IR 解析出任何 TEXT 节点 —— 判据可能已失明（查 layout-ir 的 tree 是否退化）");
  }
  const modals = targets.filter((t) => t.modal).length;
  return targets.length
    ? `${targets.length} 屏 / ${nodes} 个文本节点待断言（含 ${modals} 个弹窗；容差 ${(raw.match(/^VISUAL_TEXT_TOL=(.*)$/m) || [])[1]?.trim()}px，字号 ${(raw.match(/^VISUAL_TEXT_SIZE_TOL=(.*)$/m) || [])[1]?.trim()}px）`
    : "无含 TEXT 节点的屏（文本腿空转）";
});

// 6g. 活数据闸门（2026-09-27 事故：时间窗口类种子钉死在过去的日期 + 映射层只映射实体自身列、
//     没按 spec 的 relations 产出派生字段 + 前端样例兜底 → 统计屏 KPI/图表全空、列表屏关联列整列空、
//     日历屏无关联名称；而像素腿 / 几何腿 / 文本腿全 PASS——它们都在 gate 模式跑、冻结 Blueprint sample，
//     与真实接口/数据库无关）。
//     本项校验：脚本存在 + **已挂入 visual:data**（脚本存在但不跑 = 闸门失效）
//     + 判据未失明（spec 声明了 relations/dashboard 却无可打开的路由屏即报错）。）
checkSync("活数据闸门（spec 派生聚合 / 关联字段）", () => {
  const { spec } = resolveProject(root);
  const rels = (spec?.relations || []).length;
  const charts = (spec?.dashboard?.charts || []).length;
  if (!rels && !charts) return "spec 未声明 relations/dashboard（本项空转，不假装通过）";
  const scriptRel = "scripts/check-live-data.mjs";
  if (!existsSync(resolve(root, scriptRel))) {
    throw new Error(`缺 ${scriptRel}（spec 声明了 relations/dashboard，活数据却无断言）`);
  }
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (!String(pkg.scripts?.["visual:data"] || "").includes("check-live-data.mjs")) {
    throw new Error("check-live-data.mjs 未挂入 npm run visual:data（脚本存在但不跑 = 闸门失效）");
  }
  const screens = (spec?.screens || []).filter((s) => s.route && !s.modal);
  if (!screens.length) {
    throw new Error("spec 有 dashboard/relations 却无可打开的路由屏 —— 判据已失明（DOM 侧无从断言）");
  }
  return `relations=${rels} charts=${charts}，路由屏 ${screens.length} 个（序列非空/非平坦 + 派生字段交叉验证 + DOM 渲染）`;
});

// 6h. 单趟 DOM 采集 + 快照新鲜度（2026-09-28 性能事故：text/geom/backfill/live/gate
//     五条腿各自 launch 一个 chromium、各自把 9 屏导航一遍 —— 同一次页面渲染被采集 5 遍，
//     单是「重复导航」就占掉还原轮次的大头，且各腿之间可能读到不同时刻的 DOM。
//     改为 capture 单趟采集落 dom-snapshot.json，各腿消费同一份快照（纯计算）。
//     本项校验：①快照库存在 ②消费方确实走快照（脚本存在却不读 = 退回多趟，闸门仍会「过」但慢）
//     ③新鲜度闸门已接线（改了 IR/源码却复用旧快照 = 拿陈旧 DOM 断言，静默放行）。）
checkSync("单趟 DOM 采集（快照消费 + 新鲜度）", () => {
  const snapLib = "scripts/lib/snapshot.mjs";
  if (!existsSync(resolve(root, snapLib))) {
    throw new Error(`缺 ${snapLib}（五条腿会退回各自 launch 浏览器）`);
  }
  for (const rel of ["scripts/capture-screens.mjs"]) {
    if (!existsSync(resolve(root, rel))) throw new Error(`缺 ${rel}`);
  }
  const consumers = [
    "scripts/check-geometry.mjs",
    "scripts/check-text.mjs",
    "scripts/check-data-backfill.mjs",
    "scripts/check-live-data.mjs",
    "scripts/visual-gate.mjs",
  ];
  const missing = consumers.filter((rel) => {
    if (!existsSync(resolve(root, rel))) return true;
    return !readFileSync(resolve(root, rel), "utf8").includes("dom-snapshot")
      && !readFileSync(resolve(root, rel), "utf8").includes("snapshot.mjs");
  });
  if (missing.length) {
    throw new Error(
      `${missing.join(", ")} 未消费 dom-snapshot（各自 launch 浏览器 = 重复导航，轮次被拖慢）`,
    );
  }
  const snap = resolve(root, "artifacts/visual-diff/dom-snapshot.json");
  return existsSync(snap)
    ? `${consumers.length} 条腿走同一份快照（含新鲜度校验）`
    : `${consumers.length} 条腿走同一份快照（含新鲜度校验）；尚无快照，跑 visual:capture 生成`;
});

// 6i. 预算打点（此前「全量生成 ≤ N 分钟」没有任何落盘数据可验证，
//     链路定义还散在 package.json 的长 `&&` 串里 —— 多个入口各写一份必然漂移。
//     现在 scripts/pipeline-timing.mjs 是**唯一**链路定义处，visual:all / visual:round 均委托它，
//     每阶段耗时落 artifacts/pipeline-timing.json 并按 .env 的 PIPELINE_BUDGET_SEC 判定。
//     本项校验：阈值在 .env + 两个入口确实委托 + 报告脚本已挂 npm。）
checkSync("流水线预算打点", () => {
  const runner = "scripts/pipeline-timing.mjs";
  if (!existsSync(resolve(root, runner))) throw new Error(`缺 ${runner}（耗时无从验证）`);
  const p = resolve(root, ".env");
  if (!existsSync(p)) throw new Error("缺 .env（PIPELINE_BUDGET_SEC 必须从根 .env 读入）");
  const raw = readFileSync(p, "utf-8");
  const m = raw.match(/^PIPELINE_BUDGET_SEC=(.*)$/m);
  if (!m || !(Number(m[1].trim()) > 0)) {
    throw new Error(".env 缺 PIPELINE_BUDGET_SEC（未配置则只报告不阻断，预算形同虚设）");
  }
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const drifted = ["visual:all", "visual:round"].filter(
    (k) => !String(pkg.scripts?.[k] || "").includes("pipeline-timing.mjs"),
  );
  if (drifted.length) {
    throw new Error(
      `${drifted.join(", ")} 未委托 pipeline-timing.mjs（链路定义出现第二份真相，耗时无法打点）`,
    );
  }
  for (const rel of ["scripts/lib/concurrency.mjs"]) {
    if (!existsSync(resolve(root, rel))) throw new Error(`缺 ${rel}（并发池，抽取阶段会被串行拖慢）`);
  }
  const budgetMin = (Number(m[1].trim()) / 60).toFixed(1);
  return `预算 ${budgetMin}min，链路单一定义（visual:all / visual:round 委托打点），报告：npm run pipeline:budget`;
});

// 7. gate-masks.json 可解析（可选）
checkSync("gate-masks.json", () => {
  const masks = gateMasks(root);
  const n = Object.keys(masks).length;
  return n ? `${n} 屏配置 mask` : "未配置（可选）";
});

// 8. 产物目录可写
checkSync("artifacts/visual-diff 可写", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = resolve(root, "artifacts/visual-diff");
  mkdirSync(dir, { recursive: true });
  const probe = resolve(dir, ".doctor-probe");
  writeFileSync(probe, "ok");
  rmSync(probe, { force: true });
  return dir;
});

// 9. Playwright 浏览器可启动（最贵的检查放最后；--quick 跳过）
if (!quick) {
  await check("Playwright chromium 启动", async () => {
    const { chromium } = require("playwright");
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: "chrome" });
      return "channel=chrome";
    } catch {
      browser = await chromium.launch({ headless: true });
      return "bundled chromium";
    } finally {
      await browser?.close().catch(() => {});
    }
  });
}

// —— 输出 ——
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.info ? "  — " + r.info : ""}`);
}
if (failed.length) {
  console.error(`\nvisual:doctor 未通过（${failed.length} 项）：先修复上面 ❌ 再进还原轮次/闸门。`);
  // 不用 process.exit()：Windows + Playwright 下硬退出会触发 libuv 断言崩溃（UV_HANDLE_CLOSING）
  process.exitCode = 1;
} else {
  console.log("\n视觉工具链自检全部通过，可以跑 visual:round / visual:gate。");
}