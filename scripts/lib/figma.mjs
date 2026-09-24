import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, parseFileKey } from "./env.mjs";
import { allFrames, resolveProject } from "./project.mjs";

export function initFigma(root) {
  loadEnv(resolve(root, ".env"));
}

export function findSummary(root, fileKey) {
  const dir = resolve(root, "imports/figma");
  if (fileKey) {
    const p = resolve(dir, `${fileKey}-summary.json`);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => f.endsWith("-summary.json"));
  if (!hit) return null;
  return JSON.parse(readFileSync(resolve(dir, hit), "utf8"));
}

export function resolveFileKey(root, arg) {
  let requested = arg ? parseFileKey(arg) : undefined;
  if (!requested) {
    const { spec } = resolveProject(root);
    requested = spec?.figma?.fileKey;
  }
  const summary = findSummary(root, requested);
  const fileKey = requested || summary?.fileKey;
  return { summary, fileKey };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function figmaGet(path, token, { retries = 6 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(`https://api.figma.com/v1${path}`, {
      headers: { "X-Figma-Token": token },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    const msg = data?.err || data?.message || JSON.stringify(data).slice(0, 400);
    lastErr = new Error(`Figma ${res.status}: ${msg}`);
    if (res.status !== 429 && res.status < 500) throw lastErr;
    const wait = Math.min(8000 * 2 ** i, 60000);
    console.warn(`${lastErr.message}; retry in ${wait}ms`);
    await sleep(wait);
  }
  throw lastErr;
}

/**
 * 全屏 specs：spec.screens 全量（无标杆/非标杆之分）；无 spec 时回退 summary 中最大的画板。
 * 形状与旧 BENCHMARK_FRAMES 兼容：{ id, names, preferType, route?, shot?, type, modal? }
 */
export function allFramesFor(root, summary) {
  const specs = allFrames(root);
  if (specs?.length) return specs;
  const frames = summary?.pages?.[0]?.frames || [];
  const candidates = frames.filter((f) => (f.size?.w ?? f.w) >= 1200 && (f.size?.h ?? f.h) >= 900);
  const pickW = (f) => f.size?.w ?? f.w ?? 0;
  const pickH = (f) => f.size?.h ?? f.h ?? 0;
  const largest = candidates.sort((a, b) => pickW(b) * pickH(b) - pickW(a) * pickH(a))[0];
  if (!largest) return [];
  console.warn(
    `No screens in app-spec.json; falling back to largest frame: ${largest.name}. ` +
      `Run init-project.mjs / fill spec.screens for full coverage.`,
  );
  return [
    { id: "home", names: [largest.name], preferType: "FRAME", route: "/", shot: `${largest.name}.png`, type: "list", modal: null },
  ];
}

/** 兼容旧调用名 */
export function benchmarkFramesFor(root, summary) {
  return allFramesFor(root, summary);
}

export function pickFrame(frames, spec) {
  const hits = (frames || []).filter((f) => spec.names.includes(f.name));
  if (!hits.length) return null;
  const preferred = hits.find((f) => f.type === spec.preferType);
  return preferred || hits[0];
}