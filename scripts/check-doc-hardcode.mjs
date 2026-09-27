#!/usr/bin/env node
/**
 * 流程文档「零硬编码」检查
 *
 * 为什么需要：流程文档长期把具体项目的业务标识与实测几何写进通用规则
 * （屏名 / slug / px / 布局百分比 / 颜色 / 坐标 / 凭证），后续 agent 会把它当模板
 * 复制到新项目 → 文档从「规范」退化成「硬编码分发器」。防复发不能只靠再写一条
 * 「禁止硬编码」的规则，必须有脚本（同几何腿/文本腿的教训：判据维度要机械化）。
 *
 * 判据分两类，脚本自身不含任何业务字面量：
 *
 *   A. 结构字面量（与项目无关）：文档不得出现 设计 / 几何 / 凭证 字面量——
 *      px 尺寸、小数百分比、十六进制颜色、`宽×高`、`(x,y)` 坐标、
 *      `localhost:端口`、`rgb(a)(...)` 颜色函数。
 *      允许：HTTP 状态码、整数百分比（如「字段级 100% 还原」）、命令行非设计值。
 *
 *   B. 项目业务字面量（从 fixtures/<slug>/app-spec.json 派生）：slug、Figma fileKey、
 *      品牌、闸门账号、非 chrome 屏名、弹窗 trigger、实体名、屏 id / 表名 / 路由
 *      （常见通用结构词除外，见 GENERIC）。
 *
 * 流程文档只能：① 说明「从 app-spec / Layout IR / .env 派生」；② 用 <placeholder> 举例；
 * ③ 引用脚本名 / env key / 命令名。命中即 exit 1。
 *
 * Usage：
 *   node scripts/check-doc-hardcode.mjs                 # 扫描全部受管文档，命中即 exit 1
 *   node scripts/check-doc-hardcode.mjs --list          # 额外打印被扫描文件与判据
 *   node scripts/check-doc-hardcode.mjs --file=<路径>   # 只扫单个文件（有效性自证用：
 *                                                       #   扫旧版硬编码文档应 FAIL）
 *
 * 接线：visual-doctor 的「流程文档零硬编码」项会调用本文件导出的 scanDocs()。
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProject } from "./lib/project.mjs";

/** 受管流程文档（相对仓库根）。新增流程文档时在此登记。 */
export const DOC_TARGETS = [
  "figma-to-fullstack/SKILL.md",
  "figma-to-fullstack/visual-fidelity.md",
  "figma-to-fullstack/figma-to-fullstack.md",
  "figma-to-fullstack/reference.md",
  "AGENTS.md",
  ".cursor/rules/figma-visual-fidelity.mdc",
];

/**
 * 仓库外的**用户级副本**（跨项目 Skill / Agent）：存在则一并扫描，缺失即跳过。
 *
 * 为什么必须扫：跨项目副本是「规范分发器」——它若写进具体项目的屏名/几何/凭证，下个
 * 项目会照抄一份硬编码。仓库内文档有 docs:lint 兜底，副本此前是空白区。
 * 缺失跳过（不报违规）：别的机器上可以没装这套 Skill。
 */
export function userDocTargets() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) return [];
  const skill = resolve(home, ".cursor/skills/figma-to-fullstack");
  return [
    resolve(skill, "SKILL.md"),
    resolve(skill, "visual-fidelity.md"),
    resolve(skill, "reference.md"),
    resolve(home, ".cursor/agents/figma-to-fullstack.md"),
  ];
}

/** 默认扫描集：仓库内文档 + 用户级副本（副本缺失时跳过） */
export function defaultDocTargets() {
  return [...DOC_TARGETS, ...userDocTargets()];
}

/** 结构字面量：设计/几何/凭证值，一律不得写进流程文档。 */
const STRUCTURAL_PATTERNS = [
  { name: "px 尺寸", re: /\b\d+(?:\.\d+)?\s*px\b/gi },
  { name: "小数百分比（布局/比例值）", re: /\b\d+\.\d+\s*%/g },
  { name: "十六进制颜色", re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "宽×高尺寸", re: /\b\d+\s*×\s*\d+/g },
  { name: "坐标对 (x,y)", re: /\(\s*\d+\s*,\s*\d+\s*\)/g },
  { name: "本地端口字面量", re: /localhost:\d+/gi },
  { name: "rgb/rgba 颜色函数", re: /\brgba?\(\s*\d/gi },
];

/**
 * 通用结构词：这些是脚手架/组件类型名（不是本项目独有），出现在流程文档里不算业务硬编码。
 * 只做 fail-open（宁可漏报，也不要制造噪声假阳性）。
 */
const GENERIC = new Set([
  "home", "dashboard", "chrome", "sidebar", "header", "footer", "nav", "navbar", "menu",
  "list", "form", "detail", "modal", "chart", "schedule", "schedules",
  "login", "logout", "auth", "token", "admin",
  "name", "title", "subtitle", "status", "sort", "icon", "avatar", "description", "remark",
  "action", "actions", "search", "filter", "filters", "table", "tables", "page", "pages",
  "app", "main", "index", "data", "config", "settings", "user", "users", "role", "roles",
  // 工具/命令词：会与业务实体名撞车（如 `visual:doctor` vs 实体 Doctor），按通用词豁免
  "doctor", "gate", "geom", "text", "fields", "round", "lint", "assets", "shots", "layout", "extract",
  // 通用状态/布尔字面量：种子数据里常见，但不是业务专有值
  "active", "inactive", "open", "closed", "enabled", "disabled", "yes", "no",
  "true", "false", "null", "am", "pm",
]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 闸门冻结样本（spec.screens[].sample）里的字符串叶子。
 *
 * 用途有二：① 文档不得复述（并入业务字面量判据）；② **页面层不得自带副本**
 * （页面只消费生成物 `screenConfigs[].sample`，否则与原型标杆漂移且闸门测不到）。
 * 纯数字字符串跳过（与代码里的普通计数/行号无法可靠区分），通用词跳过
 * （GENERIC 里的状态/布尔字面量会与业务逻辑的合法比较撞车）——两者都会制造噪声假阳性。
 */
export function sampleLiterals(spec) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s.length >= 3 && !/^\d+$/.test(s) && !GENERIC.has(s.toLowerCase())) out.push(s);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const s of spec?.screens || []) walk(s?.sample);
  return [...new Set(out)];
}

/** 从 app-spec 派生「业务字面量」清单（去重、去通用词、去过短值）。 */
export function businessLiterals(spec) {
  const out = new Set();
  const add = (v, { filterGeneric = false } = {}) => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (s.length < 3) return;
    if (filterGeneric && GENERIC.has(s.toLowerCase())) return;
    out.add(s);
  };

  add(spec?.slug);
  add(spec?.figma?.fileKey);
  add(spec?.brand?.title);
  add(spec?.brand?.subtitle);
  add(spec?.seedAdmin?.email);
  add(spec?.seedAdmin?.username);
  add(spec?.seedAdmin?.password);

  for (const v of sampleLiterals(spec)) add(v, { filterGeneric: true });

  for (const s of spec?.screens || []) {
    // chrome 组件（sidebar/header 等）是结构件，其 id/name 视为通用词
    const isChrome = s?.type === "chrome";
    add(s?.name, { filterGeneric: isChrome });
    add(s?.id, { filterGeneric: true });
    add(s?.route, { filterGeneric: true });
    add(s?.modal?.trigger);
  }
  for (const e of spec?.entities || []) {
    add(e?.name, { filterGeneric: true });
    add(e?.table, { filterGeneric: true });
    add(e?.route, { filterGeneric: true });
    // 种子数据也是业务内容（原型逐字值）——文档里不得出现示例行
    for (const row of e?.seedRows || []) {
      for (const v of Object.values(row || {})) add(v, { filterGeneric: true });
    }
  }
  return [...out];
}

/** 单行内查找业务字面量（ASCII 用词边界，含 CJK 用子串）。 */
function findLiteral(line, literal) {
  const isAscii = /^[\x20-\x7E]+$/.test(literal);
  if (isAscii) {
    const re = new RegExp(`(?<![\\w-])${escapeRe(literal)}(?![\\w-])`, "i");
    const m = re.exec(line);
    return m ? m[0] : null;
  }
  return line.includes(literal) ? literal : null;
}

/** 扫描指定文档（默认全部受管文档 + 用户级副本），返回 { files, violations, literals }。 */
export function scanDocs(root, rels = defaultDocTargets()) {
  const { spec } = safeProject(root);
  const literals = businessLiterals(spec);
  const files = [];
  const violations = [];
  const home = process.env.USERPROFILE || process.env.HOME || "";

  for (const rel of rels) {
    const abs = resolve(root, rel);
    const outsideRoot = isAbsolute(rel) && relative(root, abs).startsWith("..");
    /** 仓库外目标显示成 ~/… 形式，日志更好读 */
    const label =
      outsideRoot && home && abs.toLowerCase().startsWith(home.toLowerCase())
        ? "~" + abs.slice(home.length).replace(/\\/g, "/")
        : rel;
    if (!existsSync(abs)) {
      // 仓库外目标（用户级副本）缺失 → 跳过；仓库内目标缺失 → 登记违规
      if (!outsideRoot) {
        violations.push({ file: label, line: 0, rule: "缺失", token: label, text: "流程文档不存在（DOC_TARGETS 登记了但文件缺失）" });
      }
      continue;
    }
    files.push(label);
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { name, re } of STRUCTURAL_PATTERNS) {
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) violations.push({ file: label, line: i + 1, rule: name, token: m[0], text: line.trim() });
      }
      for (const lit of literals) {
        const hit = findLiteral(line, lit);
        if (hit) violations.push({ file: label, line: i + 1, rule: "项目业务字面量", token: hit, text: line.trim() });
      }
    });
  }
  return { files, violations, literals };
}

function safeProject(root) {
  try {
    return resolveProject(root);
  } catch {
    // 无 app-spec 时退化为「只做结构检查」
    return { slug: null, spec: null };
  }
}

// —— CLI（直接执行才跑；visual-doctor 会 import 本模块的 scanDocs，不可带副作用）——
const isDirectRun =
  process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isDirectRun) {
  const root = resolve(process.cwd());
  const fileArg = (process.argv.find((a) => a.startsWith("--file=")) || "").split("=")[1];
  const { files, violations, literals } = scanDocs(root, fileArg ? [fileArg] : defaultDocTargets());
  const list = process.argv.includes("--list");
  if (list) {
    console.log(`受管流程文档（${files.length}）：`);
    for (const f of files) console.log(`  - ${f}`);
    console.log(`业务字面量判据（从 app-spec 派生，${literals.length} 条）：${literals.join(", ")}\n`);
  }
  if (!violations.length) {
    console.log(`✅ 流程文档零硬编码（${files.length} 个文档，未命中结构字面量 / 项目业务字面量）`);
    process.exitCode = 0;
  } else {
    console.error(`❌ 流程文档命中硬编码 ${violations.length} 处：`);
    for (const v of violations) {
      const loc = v.line ? `${v.file}:${v.line}` : v.file;
      console.error(`  ${loc}  [${v.rule}]  «${v.token}»`);
      console.error(`      ${v.text}`);
    }
    console.error("\n修法：文档只写「从 app-spec / Layout IR / .env 派生」或用 <placeholder> 举例；");
    console.error("      实现值一律取 fixtures/<slug>/*.json 与仓库根 .env，不得在文档里复述字面量。");
    process.exitCode = 1;
  }
}
