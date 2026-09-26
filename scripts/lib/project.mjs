/**
 * 项目单一来源：fixtures/<slug>/app-spec.json
 *
 * slug 解析优先级：
 *   1. env FIGMA_SLUG
 *   2. fixtures/ 下唯一含 app-spec.json 的目录
 *   3. 报错（多项目时要求显式指定）
 *
 * 脚本不得再硬编码项目 slug / 标杆屏 / 登录凭证；一律从这里读。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 注入仓库根 .env 到 process.env（不覆盖已显式设置的值）。
 * 读阈值的脚本（visual-gate / visual-compare）必须先调用：否则 .env 里的
 * VISUAL_SSIM_MIN 不生效，静默落到代码默认值 → 闸门假阳性
 * （2026-09-26 事故：.env 写 0.85，闸门实跑 0.55，首页 SSIM 0.807 却判通过）。
 */
export function loadRootEnv(root) {
  const p = resolve(root, ".env");
  if (!existsSync(p)) return {};
  const loaded = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2] !== "" && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2];
      loaded[m[1]] = m[2];
    }
  }
  return loaded;
}

export function resolveProject(root) {
  const fixturesDir = resolve(root, "fixtures");
  const candidates = existsSync(fixturesDir)
    ? readdirSync(fixturesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(resolve(fixturesDir, d.name, "app-spec.json")))
        .map((d) => d.name)
    : [];

  let slug = process.env.FIGMA_SLUG || null;
  if (!slug && candidates.length === 1) slug = candidates[0];
  if (!slug && candidates.length > 1) {
    throw new Error(
      `Multiple projects with app-spec.json: ${candidates.join(", ")}. Set FIGMA_SLUG=<slug> or pass --slug.`,
    );
  }

  const specPath = slug ? resolve(fixturesDir, slug, "app-spec.json") : null;
  if (slug && !existsSync(specPath)) {
    throw new Error(`fixtures/${slug}/app-spec.json not found. Run: node scripts/init-project.mjs --slug ${slug} --file <fileKey>`);
  }
  const spec = specPath ? JSON.parse(readFileSync(specPath, "utf8")) : null;
  return { slug, spec, specPath };
}

/** slug 兜底：无 app-spec 时用 fileKey 作为 slug（仅限只读 Figma 的脚本） */
export function slugOrDefault(root, fileKey) {
  const { slug } = resolveProject(root);
  return slug || fileKey || "default";
}

/**
 * 全屏清单（spec.screens 即闸门全集，无标杆屏双轨）→ 与 BENCHMARK_FRAMES 兼容的形状。
 * spec.screens: [{ id, type, route, name, description, modal? }]
 * type: chart|list|form|detail|modal|chrome
 * modal: { trigger: "新增科室", width?, height? }（type=modal 时）
 */
export function allFrames(root) {
  const { spec } = resolveProject(root);
  const screens = spec?.screens;
  if (!Array.isArray(screens) || !screens.length) return null;
  return screens.map((s) => ({
    id: s.id,
    names: [s.name, s.id].filter(Boolean),
    preferType: s.type === "chrome" ? "COMPONENT" : "FRAME",
    route: s.route,
    shot: s.name ? `${s.name}.png` : `${s.id}.png`,
    type: s.type || "list",
    modal: s.modal || null,
  }));
}

/** 兼容旧调用名：现与 allFrames 同义（全屏清单，无标杆/非标杆之分） */
export function benchmarkFrames(root) {
  return allFrames(root);
}

/**
 * 视觉闸门登录信息。
 * 优先级：env GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD > app-spec.seedAdmin > 报错。
 * localStorage key：app-spec.auth.storageKey（默认 auth_token）。
 */
export function gateCredentials(root) {
  const { spec } = resolveProject(root);
  const email = process.env.GATE_ADMIN_EMAIL || spec?.seedAdmin?.email;
  const username = process.env.GATE_ADMIN_USERNAME || spec?.seedAdmin?.username || email;
  const password = process.env.GATE_ADMIN_PASSWORD || spec?.seedAdmin?.password;
  const storageKey = spec?.auth?.storageKey || "auth_token";
  if (!username || !password) {
    throw new Error(
      "Missing gate credentials. Set GATE_ADMIN_USERNAME/GATE_ADMIN_PASSWORD in .env, or seedAdmin{username,password} in app-spec.json.",
    );
  }
  return { email, username, password, storageKey };
}

/**
 * 弹窗外沿余量：Figma 弹窗导出图 = 卡片 + 阴影溢出（IR 卡片 RECTANGLE 的 shadow {r,x,y}），
 * 四边余量 = 左 r-x、右 r+x、上 r-y、下 r+y（r=模糊半径，x/y=偏移）。
 *
 * 为什么必须这样补：运行时截图截的是 .ant-modal-content 本体，标杆图却含阴影余量。
 * 若统一补 12px（旧实现），纵向会与标杆差 y（本设计 y=4）→ 卡片在两图里错位 4px，
 * 位图逐像素比直接判「结构错位」（2026-09-26 四个弹窗 SSIM 0.55~0.64 的根因）。
 * 余量从 IR 读，不按屏硬编码；无 IR/无阴影时回落到 0（不补，宁可比对失败也不假装对齐）。
 */
export function shadowPad(root, id) {
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  const { slug } = resolveProject(root);
  if (!slug) return zero;
  const p = resolve(root, "fixtures", slug, "layout-ir", `${id}.json`);
  if (!existsSync(p)) return zero;
  let s = null;
  const walk = (n) => {
    if (!s && n?.shadow) s = n.shadow;
    (n?.children || []).forEach(walk);
  };
  try {
    walk(JSON.parse(readFileSync(p, "utf8")).tree);
  } catch {
    return zero;
  }
  if (!s) return zero;
  const r = Number(s.r) || 0;
  const x = Number(s.x) || 0;
  const y = Number(s.y) || 0;
  return {
    left: Math.max(0, Math.round(r - x)),
    right: Math.max(0, Math.round(r + x)),
    top: Math.max(0, Math.round(r - y)),
    bottom: Math.max(0, Math.round(r + y)),
  };
}

/** 可选的闸门 mask 配置：fixtures/<slug>/gate-masks.json → { [screenId]: [{x,y,w,h}] } */
export function gateMasks(root) {
  const { slug } = resolveProject(root);
  if (!slug) return {};
  const p = resolve(root, "fixtures", slug, "gate-masks.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    console.warn("gate-masks.json parse failed; ignoring masks");
    return {};
  }
}