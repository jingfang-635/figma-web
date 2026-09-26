/**
 * 像素级结构度量（visual-gate / visual-compare 共用）
 *
 * 为什么需要「平坦底色漂移」(flatBgDrift)：
 *   2026-09-26 事故——首页「关键指标」区块在原型里**没有白卡底**（4 个 263x78 白格子
 *   直接落在 #F5F7FA 画布上），实现却套了 .chart-card 白底 → 白格子叠白卡，格子边界消失。
 *   该差异被现有两条腿双双漏掉，实证：
 *     - mismatch 腿：pixelmatch 的 threshold=0.25 只统计「色差 ≥ 25%」的像素，
 *       而 #FFFFFF vs #F5F7FA 的亮度差仅 ~3.9% → 该差异在闸门里**等于不存在**。
 *       实测：修复前 1.194% / 事故版 1.191%（bug 版反而更低）。
 *     - SSIM 腿：整屏 1.5M 像素里只有 1.6 万像素错色，被稀释成 0.869 → 0.882，
 *       0.85 阈值根本没触发。
 *   把 pixelmatch threshold 降到 0.03 以下，信号才出现（2.46% → 7.55%）——即
 *   **阈值高于色差 = 结构性失明**。
 *
 *   flatBgDrift 换一个判据：只在「标杆为平坦色块」处（3x3/7x7 邻域色彩极差 ≤ flatTol，
 *   文字笔画一律排除）要求运行时同色，容差 driftTol 收紧到 4/255（≈1.6%）。
 *   它不看文字渲染，因此噪声低、信噪比高——实证（rad=3, flatTol=3, driftTol=4）：
 *     修复后 0.32%  vs  事故版 4.89%（信号/噪声 ≈ 15x）
 *   全屏基线 0.32%~1.44%（余下漂移来自文字亚像素位置差），弹窗 1.88%~4.03%。
 *
 *   反例：全局「长直线 / 边缘一致性」指标试过，不可用——文字抗锯齿令全屏
 *   missRate 基线就达 25%~40%，弹窗 90%+，信号（15.9%→34.1%）淹没在基线里，
 *   无法全局定阈值。故采用「只看平坦底色」这一有明确语义的判据。
 */

/** 平坦底色判据默认参数（改动前先跑 calibration，见 visual-gate --calibrate） */
export const FLATBG_DEFAULTS = {
  /** 邻域半径：以该像素为中心的 (2rad+1)^2 窗口内亮度极差 */
  rad: 3,
  /** 窗口内亮度极差 ≤ flatTol → 标杆此处是「平坦色块」（文字笔画会被排除） */
  flatTol: 3,
  /** 平坦处允许的运行时亮度漂移（0~255）；4 ≈ 1.6% 色差，#F5F7FA→#FFFFFF(≈9.7) 必被抓 */
  driftTol: 4,
};

function luma(png) {
  const g = new Float32Array(png.width * png.height);
  for (let i = 0, p = 0; p < g.length; p++, i += 4) {
    g[p] = (png.data[i] * 299 + png.data[i + 1] * 587 + png.data[i + 2] * 114) / 1000;
  }
  return g;
}

/**
 * 平坦底色漂移：标杆为平坦色块处、运行时颜色却漂移的像素占比。
 * 语义 =「底色 / 卡片底 / 容器填充」是否还原正确（文字渲染差异被排除）。
 * @returns {{area:number, drift:number, rate:number}}
 */
export function flatBgDrift(exp, act, opts = {}) {
  const { rad, flatTol, driftTol } = { ...FLATBG_DEFAULTS, ...opts };
  const w = Math.min(exp.width, act.width);
  const h = Math.min(exp.height, act.height);
  const ge = luma(exp);
  const ga = luma(act);
  let area = 0;
  let drift = 0;
  for (let y = rad; y < h - rad; y++) {
    for (let x = rad; x < w - rad; x++) {
      const p = y * w + x;
      let mn = Infinity;
      let mx = -Infinity;
      for (let dy = -rad; dy <= rad; dy++) {
        const row = (y + dy) * w;
        for (let dx = -rad; dx <= rad; dx++) {
          const v = ge[row + x + dx];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      if (mx - mn > flatTol) continue;
      area++;
      if (Math.abs(ga[p] - ge[p]) > driftTol) drift++;
    }
  }
  return { area, drift, rate: area ? drift / area : 0 };
}

/**
 * 漂移像素热力图：洋红标出「标杆是平坦底色、运行时却变了色」的位置。
 * 与 diff.png 的区别：diff 只标高对比差异（文字），此图专标低对比底色错——正是闸门原先的盲区。
 */
export function flatBgDriftOverlay(exp, act, PNG, opts = {}) {
  const { rad, flatTol, driftTol } = { ...FLATBG_DEFAULTS, ...opts };
  const w = Math.min(exp.width, act.width);
  const h = Math.min(exp.height, act.height);
  const ge = luma(exp);
  const ga = luma(act);
  const out = new PNG({ width: w, height: h });
  // 底色 = 标杆灰度（保留上下文），漂移处涂洋红
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    const v = Math.round(ge[p]);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  for (let y = rad; y < h - rad; y++) {
    for (let x = rad; x < w - rad; x++) {
      const p = y * w + x;
      let mn = Infinity;
      let mx = -Infinity;
      for (let dy = -rad; dy <= rad; dy++) {
        const row = (y + dy) * w;
        for (let dx = -rad; dx <= rad; dx++) {
          const v = ge[row + x + dx];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      if (mx - mn > flatTol) continue;
      if (Math.abs(ga[p] - ge[p]) <= driftTol) continue;
      const i = p * 4;
      out.data[i] = 255;
      out.data[i + 1] = 0;
      out.data[i + 2] = 255;
    }
  }
  return out;
}
