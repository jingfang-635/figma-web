import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, parseFileKey } from "./env.mjs";

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
    const specPath = resolve(root, "fixtures/sunshine-medical/app-spec.json");
    if (existsSync(specPath)) {
      try {
        requested = JSON.parse(readFileSync(specPath, "utf8"))?.figma?.fileKey;
      } catch {
        requested = undefined;
      }
    }
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

export const BENCHMARK_FRAMES = [
  { id: "sidebar", names: ["sidebar"], preferType: "COMPONENT" },
  { id: "home", names: ["首页"], preferType: "FRAME" },
  { id: "organization", names: ["机构信息"], preferType: "FRAME" },
  { id: "departments", names: ["科室管理"], preferType: "FRAME" },
  { id: "schedules", names: ["排班管理"], preferType: "FRAME" },
  { id: "modal-create-dept", names: ["新增科室弹窗"], preferType: "FRAME" },
];

export function pickFrame(frames, spec) {
  const hits = (frames || []).filter((f) => spec.names.includes(f.name));
  if (!hits.length) return null;
  const preferred = hits.find((f) => f.type === spec.preferType);
  return preferred || hits[0];
}
