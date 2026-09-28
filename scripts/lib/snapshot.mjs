/**
 * DOM 快照的读写与**新鲜度校验**（无业务语义）。
 *
 * 为什么要校验新鲜度：采集与断言拆开后，各腿不再自己开浏览器，
 * 于是「快照是上一版代码/上一版 IR 采的」会**静默放行**——这正是本仓库
 * 反复强调的那类"闸门失效"（判据还在，但判据的对象过期了）。
 * 故采集时把「判据来源」的指纹写进快照，各腿读时重算比对，
 * 不一致即 exit 1（提示重跑采集），而不是拿旧数据下结论。
 *
 * 指纹来源（全部是判据的输入）：app-spec + 全部 layout-ir + 前端源码树 + web 地址。
 * 不含时间戳，故「代码/IR 未变」时指纹稳定。
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadRootEnv } from "./project.mjs";

const WEB_SOURCE_DIRS = [
  "apps/web/src/pages",
  "apps/web/src/components",
  "apps/web/src/generated",
  "apps/web/src/blueprints",
  "apps/web/src/styles",
  "apps/web/src/theme",
];

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir).sort()) {
    const p = resolve(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

export function computeSourcesHash(root, slug) {
  // 必须先把根 .env 读进来：指纹里含 WEB_URL（不同后端地址渲染结果不同）。
  // 采集方（capture-screens）会 loadRootEnv，断言方若没读 .env，
  // 同一份代码会算出两个指纹 → 每次都被误判为「快照过期」。
  loadRootEnv(root);
  const h = createHash("sha1");
  const specPath = resolve(root, "fixtures", slug, "app-spec.json");
  if (existsSync(specPath)) h.update(readFileSync(specPath));
  for (const f of walkFiles(resolve(root, "fixtures", slug, "layout-ir"))) {
    h.update(f.replace(root, ""));
    h.update(readFileSync(f));
  }
  for (const dir of WEB_SOURCE_DIRS) {
    for (const f of walkFiles(resolve(root, dir))) {
      h.update(f.replace(root, ""));
      h.update(readFileSync(f));
    }
  }
  h.update(process.env.WEB_URL || "");
  return h.digest("hex").slice(0, 16);
}

export function snapshotPath(root) {
  return resolve(root, "artifacts/visual-diff/dom-snapshot.json");
}

/**
 * 读取快照并校验新鲜度。
 * @param {{ root: string, slug: string, leg: string }} opts
 * @returns {object} 快照
 */
export function loadSnapshot({ root, slug, leg }) {
  const p = snapshotPath(root);
  if (!existsSync(p)) {
    console.error(
      `❌ ${leg}：缺少 DOM 快照 ${p}\n   采集与断言已解耦，先跑采集：npm run visual:capture（或 npm run visual:round 会自动跑）`,
    );
    process.exit(1);
  }
  let snap;
  try {
    snap = JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`❌ ${leg}：DOM 快照无法解析（${e.message}）→ 重跑 npm run visual:capture`);
    process.exit(1);
  }
  const now = computeSourcesHash(root, slug);
  if (snap.sourcesHash && snap.sourcesHash !== now) {
    console.error(
      `❌ ${leg}：DOM 快照已过期（指纹 ${snap.sourcesHash} → 当前 ${now}）。\n` +
        `   spec / Layout IR / 前端源码在采集之后被改过，旧快照不能作为判据。\n` +
        `   重跑：npm run visual:capture（或 npm run visual:round）`,
    );
    process.exit(1);
  }
  return snap;
}
