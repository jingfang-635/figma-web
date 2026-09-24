#!/usr/bin/env node
/**
 * 项目初始化：解析 Figma 结构 → 生成 app-spec.json 骨架（screens 全量即闸门全集）
 *
 * Usage:
 *   node scripts/init-project.mjs --slug <slug> --file <fileKey或URL> [--name <项目名>] [--yes]
 *
 * 产出：
 *   imports/figma/<fileKey>-summary.json   页面/Frame 清单
 *   fixtures/<slug>/app-spec.json          App Spec 骨架（screens 从 summary 推断，needsReview 标记）
 *
 * 骨架中 screens 全量生成（无标杆/非标杆之分），needsReview 标记待人工确认。
 * 实体/API 由人工（或 LLM 辅助）在闸门环节补齐 —— 本脚本不臆造业务。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initFigma, figmaGet } from "./lib/figma.mjs";

const root = resolve(process.cwd());
initFigma(root);

// —— 参数解析 ——
const args = process.argv.slice(2);
function argOf(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const slug = argOf("slug");
const fileArg = argOf("file");
const name = argOf("name");
const yes = args.includes("--yes");
if (!slug || !fileArg) {
  console.error("Usage: node scripts/init-project.mjs --slug <slug> --file <fileKey或URL> [--name <项目名>]");
  process.exit(1);
}

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error("FIGMA_ACCESS_TOKEN missing in .env");
  process.exit(1);
}

const m = String(fileArg).match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
const fileKey = /^[a-zA-Z0-9]+$/.test(fileArg) ? fileArg : m?.[1];
if (!fileKey) {
  console.error("Invalid fileKey/URL");
  process.exit(1);
}

// —— 1. 拉取结构 ——
console.log("Fetching Figma overview:", fileKey);
const data = await figmaGet(`/files/${fileKey}?depth=3`, token);
const projectName = name || data.name || slug;

const frames = [];
for (const page of data.document?.children || []) {
  const walk = (nodes, depth = 0) => {
    for (const n of nodes || []) {
      if (["FRAME", "COMPONENT", "INSTANCE", "SECTION"].includes(n.type)) {
        frames.push({
          id: n.id,
          type: n.type,
          name: n.name,
          w: Math.round(n.absoluteBoundingBox?.width || 0),
          h: Math.round(n.absoluteBoundingBox?.height || 0),
          size: {
            w: Math.round(n.absoluteBoundingBox?.width || 0),
            h: Math.round(n.absoluteBoundingBox?.height || 0),
          },
        });
      }
      if (n.children && depth < 2) walk(n.children, depth + 1);
    }
  };
  walk(page.children || []);
}
console.log(`Frames: ${frames.length}`);

// —— 2. 写 summary（供后续脚本复用，免二次拉取）——
mkdirSync(resolve(root, "imports/figma"), { recursive: true });
const summary = {
  name: data.name,
  lastModified: data.lastModified,
  fileKey,
  pages: [
    {
      id: data.document.children[0]?.id,
      name: data.document.children[0]?.name || "",
      frames,
    },
  ],
};
writeFileSync(
  resolve(root, "imports/figma", `${fileKey}-summary.json`),
  JSON.stringify(summary, null, 2),
  "utf8",
);
console.log("Wrote imports/figma/" + fileKey + "-summary.json");

// —— 3. 生成 App Spec 骨架 ——
const isScreen = (f) => f.w >= 1200 && f.h >= 900 && f.type !== "COMPONENT";
const screenFrames = frames.filter(isScreen);
const modalFrames = frames.filter((f) => String(f.name).includes("弹窗"));
const chromeFrames = frames.filter((f) => f.type === "COMPONENT" && !String(f.name).includes("弹窗"));

// 模板推断（通用启发式，可在闸门时人工修正）
function classify(name) {
  if (/首页|工作台|看板|dashboard/i.test(name)) return "dashboard";
  if (/排班|日历|calendar/i.test(name)) return "schedule";
  if (/规则|设置|信息|profile|settings|配置/i.test(name)) return "form";
  return "list";
}
function routeOf(name) {
  const cn = name; // 中文屏名直接映射为路由 slug；闸门时可人工修正
  return `/${cn}`;
}
function entityOf(name) {
  const cleaned = name.replace(/管理|列表|记录/g, "");
  return cleaned; // 闸门时由人工/LLM 确认英文名
}

const screens = screenFrames.map((f) => ({
  id: f.name,
  name: f.name,
  route: routeOf(f.name),
  type: classify(f.name),
  entity: entityOf(f.name),
  needsReview: true,
}));

// 全屏闸门：screens 即闸门全集（无标杆/非标杆之分）

const spec = {
  version: "1.0",
  name: projectName,
  figma: { fileKey, url: `https://www.figma.com/design/${fileKey}` },
  slug,
  stack: {
    id: "", // 必填：闸门环节由用户逐层选择后填写（A/A2/B/C/D），无默认
    language: "",
    frontend: "",
    backend: "",
    database: "",
    orm: "",
  },
  auth: { mode: "jwt", storageKey: "auth_token" },
  brand: { title: data.name, subtitle: "" },
  entities: [],
  apis: [],
  screens,
  seedAdmin: null, // 闸门时填写：{ email, password }
  notes: [
    "骨架由 init-project.mjs 生成；screens/entities/apis 为推断值，needsReview=true",
    "闸门环节必须人工确认：实体英文名、路由、screens 全量、seedAdmin（screens 即闸门全集，无标杆屏）",
  ],
};

const specDir = resolve(root, "fixtures", slug);
mkdirSync(specDir, { recursive: true });
const specPath = resolve(specDir, "app-spec.json");
if (existsSync(specPath) && !yes) {
  console.error(`EXISTS: ${specPath} — 用 --yes 覆盖`);
  process.exit(1);
}
writeFileSync(specPath, JSON.stringify(spec, null, 2), "utf8");
console.log("Wrote", specPath);
console.log(`screens=${screens.length} modals=${modalFrames.length}（全量即闸门全集）`);
console.log("\n下一步：");
console.log("1. 人工确认 fixtures/" + slug + "/app-spec.json（stack 必填 + 实体/路由/screens/seedAdmin）");
console.log("2. npm run visual:layout && npm run visual:extract && npm run visual:shots");
console.log("3. 回填 scripts 回 catalog 后 npm run visual:gen");