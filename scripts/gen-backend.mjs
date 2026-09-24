#!/usr/bin/env node
/**
 * 后端 codegen（spec 驱动，零业务硬编码）
 *
 * 读 fixtures/<slug>/app-spec.json 的 stack + entities + seedAdmin + auth，
 * 按栈矩阵（lib/codegen/stacks.mjs）分发 adapter 生成：
 *   - node  栈（A/A2/B）→ NestJS + Prisma：schema / seed / auth / CRUD / dashboard
 *   - java 栈（C/D）    → Spring Boot + JPA：entity / repository / controller / seed / auth
 *
 * Usage:
 *   node scripts/gen-backend.mjs [--slug <slug>] [--stack <id>] [--out <dir>] [--spec <path>] [--seed-only]
 *
 * 项目解析复用 scripts/lib/project.mjs（FIGMA_SLUG > 唯一 fixture > 报错）。
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "./lib/env.mjs";
import { resolveProject } from "./lib/project.mjs";
import { validateStack } from "./lib/codegen/stacks.mjs";
import { normalizeEntities } from "./lib/codegen/util.mjs";
import { generateNestPrisma } from "./lib/codegen/node-nest.mjs";
import { generateSpringJpa } from "./lib/codegen/java-spring.mjs";

const root = resolve(process.cwd());
loadEnv(resolve(root, ".env"));

// —— 参数解析 ——
const args = process.argv.slice(2);
function argOf(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const slugArg = argOf("slug");
const stackArg = argOf("stack");
const outArg = argOf("out") || "apps";
const specArg = argOf("spec");
const seedOnly = args.includes("--seed-only");

// —— 1. 定位 spec（--spec 显式路径优先，其次 resolveProject）——
let slug, spec, specPath;
if (specArg) {
  specPath = resolve(root, specArg);
  if (!existsSync(specPath)) {
    console.error(`spec not found: ${specPath}`);
    process.exit(1);
  }
  spec = JSON.parse(readFileSync(specPath, "utf8"));
  slug = slugArg || spec.slug || "default";
} else {
  ({ slug, spec, specPath } = resolveProject(root));
  if (!spec) {
    console.error(
      "No app-spec.json found under fixtures/. Run init:project first, or pass --spec <path>.",
    );
    process.exit(1);
  }
  if (slugArg && slugArg !== slug) {
    console.error(`--slug ${slugArg} 与解析结果 ${slug} 不一致`);
    process.exit(1);
  }
}

// —— 2. 校验栈矩阵 ——
const stack = validateStack(spec.stack, stackArg);
console.log(`[gen-backend] project=${slug} stack=${stack.id} (${stack.language}/${stack.backend}/${stack.database}/${stack.orm})`);

// —— 3. 归一化实体（显式 entities 优先；闸门未填时从 screens 推断兜底）——
const entities = normalizeEntities(spec.entities?.length ? spec.entities : entitiesFromScreens(spec));
if (!spec.entities?.length) {
  console.warn(
    `[gen-backend] spec.entities 为空，已从 screens 推断 ${entities.length} 个实体（闸门时请人工确认 entities 字段）。`,
  );
}
for (const e of entities) {
  if (!e.fields.length) {
    console.error(`[gen-backend] 实体 ${e.name} 无字段（spec.entities[].fields），无法生成。请在闸门环节回填字段。`);
    process.exit(1);
  }
}
console.log(`[gen-backend] entities: ${entities.map((e) => e.name).join(", ") || "(none)"}`);

// —— 4. 分发 adapter ——
const ctx = {
  root,
  slug,
  spec,
  stack,
  entities,
  outDir: resolve(root, outArg),
  seedOnly,
};
const report =
  stack.language === "node" ? generateNestPrisma(ctx) : generateSpringJpa(ctx);

// —— 5. 汇总输出 ——
console.log(`[gen-backend] wrote ${report.files.length} files under ${outArg}/api:`);
for (const f of report.files) console.log(`  + ${f}`);
console.log(
  `[gen-backend] done. db=${stack.database} seedAdmin=${spec.seedAdmin ? "yes" : "MISSING(闸门需填写)"}`,
);

/** 从 screens 推断实体的兜底（复用 util 逻辑，避免循环依赖处直接内联） */
function entitiesFromScreens(screens = []) {
  const seen = new Map();
  for (const s of screens || []) {
    if (!["list", "form", "detail"].includes(s.type)) continue;
    if (!s.entity || s.needsReview) continue;
    if (seen.has(s.entity)) continue;
    const fields = new Map();
    for (const f of s.formFields || []) {
      if (f.key) fields.set(f.key, formTypeToSpecType(f.type));
    }
    for (const c of s.table?.columns || []) {
      if (c.key && !fields.has(c.key)) fields.set(c.key, "String");
    }
    seen.set(s.entity, {
      name: s.entity,
      fields: [...fields.entries()].map(([k, v]) => ({ name: k, type: v })),
    });
  }
  return [...seen.values()];
}

function formTypeToSpecType(t) {
  switch (t) {
    case "number":
      return "Integer";
    case "switch":
      return "Boolean";
    case "date":
      return "DateTime";
    default:
      return "String";
  }
}