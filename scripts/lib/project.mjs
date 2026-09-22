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
 * 标杆屏（benchmarkScreens）→ 与 BENCHMARK_FRAMES 兼容的形状。
 * spec.benchmarkScreens: [{ id, type, route, name, description, modal? }]
 * type: chart|list|form|detail|modal|chrome
 * modal: { trigger: "新增科室", width?, height? }（type=modal 时）
 */
export function benchmarkFrames(root) {
  const { spec } = resolveProject(root);
  const bms = spec?.benchmarkScreens;
  if (!Array.isArray(bms) || !bms.length) return null;
  return bms.map((b) => ({
    id: b.id,
    names: [b.name, b.id].filter(Boolean),
    preferType: b.type === "chrome" ? "COMPONENT" : "FRAME",
    route: b.route,
    shot: b.name ? `${b.name}.png` : `${b.id}.png`,
    type: b.type || "list",
    modal: b.modal || null,
  }));
}

/**
 * 视觉闸门登录信息。
 * 优先级：env GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD > app-spec.seedAdmin > 报错。
 * localStorage key：app-spec.auth.storageKey（默认 auth_token）。
 */
export function gateCredentials(root) {
  const { spec } = resolveProject(root);
  const email = process.env.GATE_ADMIN_EMAIL || spec?.seedAdmin?.email;
  const password = process.env.GATE_ADMIN_PASSWORD || spec?.seedAdmin?.password;
  const storageKey = spec?.auth?.storageKey || "auth_token";
  if (!email || !password) {
    throw new Error(
      "Missing gate credentials. Set GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD in .env, or seedAdmin{email,password} in app-spec.json.",
    );
  }
  return { email, password, storageKey };
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