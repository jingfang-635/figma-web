/**
 * 通用并发工具（无业务语义，不含任何按屏 / 业务硬编码）。
 *
 * 为什么需要：流水线的图取 / 下载步骤此前一律**串行**——68 个图标逐个 `await fetch`、
 * 16 张截图逐个下载、10 屏 `/nodes` 逐个请求且每次后固定 `sleep(800)`——
 * 网络往返被完全串起来，图取阶段因此占掉全流程近三分之一时间。
 *
 * 并发度属于**通用基础设施参数**（与具体项目无关），统一取 `.env` 的
 * `PIPELINE_CONCURRENCY`；未配置时用一个保守的通用默认值，
 * 不在此处写死任何业务 / 设计值。
 */

/** 保守默认（纯基础设施值，非业务/设计值）：并发过高会触发 Figma 429。 */
const DEFAULT_CONCURRENCY = 6;

export function concurrencyFromEnv() {
  const n = Number(process.env.PIPELINE_CONCURRENCY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CONCURRENCY;
}

/**
 * 按固定并发度跑 worker，保序返回结果。
 * 单个 worker 抛错不中断其余（结果记为 { ok:false, error }），由调用方决定是否致命。
 */
export async function mapPool(items, worker, { concurrency = concurrencyFromEnv() } = {}) {
  const list = [...items];
  const out = new Array(list.length);
  let next = 0;
  const lanes = Math.max(1, Math.min(concurrency, list.length));
  await Promise.all(
    Array.from({ length: lanes }, async () => {
      for (;;) {
        const i = next++;
        if (i >= list.length) return;
        try {
          out[i] = { ok: true, value: await worker(list[i], i) };
        } catch (error) {
          out[i] = { ok: false, error };
        }
      }
    }),
  );
  return out;
}

/** 把数组切成固定大小的块（用于批量请求，避免单个请求过大）。 */
export function chunk(list, size) {
  const out = [];
  const n = Math.max(1, Math.floor(size));
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

/**
 * 批量请求的分块大小（通用，从 .env 读；未配置时用保守默认）。
 * 单请求过大 → 响应慢 / 超时；过小 → 往返次数多。
 */
export function batchSizeFromEnv(key, fallback) {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
