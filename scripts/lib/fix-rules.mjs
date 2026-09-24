/**
 * 差异自动修复规则库（spec 驱动，无业务硬编码）。
 *
 * 背景：2026-09-24 复盘发现，还原轮次的像素级差异高度重复：
 *   行高差 3px（antd td 默认上下 16px vs Figma 62px 行）、按钮位置、卡头样式……
 * 本库把「diff 特征 → 已知修法」沉淀为规则表。visual:round 的差异报告生成后
 * 逐条匹配规则：**已知特征**给出 fix 提示并标记 known；**未识别 diff** 标记 manual 升级给人。
 *
 * 新规律摸出来后往 FIX_RULES 追加：diffKeywords 命中差异表文本，fix.hint 描述确定性改动。
 */

export const FIX_RULES = [
  {
    id: "table-row-height",
    desc: "表格行高偏差（antd 默认 td 上下 16px；Figma 常见 62px 行 → cellPaddingBlock 13px）",
    // 主题生成器已从 Layout IR 自动算 cellPaddingBlock；此规则仅在 IR 推断失败时兜底
    diffKeywords: ["行高", "row", "表格", "table"],
    check: (ctx) => ctx.themeHasCellPadding === false,
    fix: {
      file: "apps/web/src/theme/antdTheme.ts",
      hint: "components.Table.cellPaddingBlock = round((目标行高 - 36) / 2)；行高从 Layout IR 等差矩形群推断（generate-tokens-css.mjs）",
    },
  },
  {
    id: "modal-geometry",
    desc: "弹窗几何偏差（header 高度 / padding / 标题字号）",
    diffKeywords: ["弹窗", "modal", "标题"],
    check: (ctx) => ctx.themeHasModalToken === false,
    fix: {
      file: "apps/web/src/theme/antdTheme.ts",
      hint: "components.Modal.titleFontSize = IR 弹窗标题文本高度 / 1.4；header 高度（61px）用 .ant-modal-header 覆盖",
    },
  },
  {
    id: "button-position",
    desc: "主操作按钮位置：Figma 在 Card 头部右侧（Card extra），生成模板默认在 toolbar",
    diffKeywords: ["按钮", "新增", "extra", "toolbar", "action"],
    fix: {
      file: "apps/web/src/pages/<ListPage>.tsx",
      hint: "把 <Button type=primary> 从 toolbar 移到 <Card extra>；toolbar 只留搜索/筛选",
    },
  },
  {
    id: "card-header-style",
    desc: "列表卡头样式偏差（min-height 56px / title 16px 500 / extra 13px）",
    diffKeywords: ["卡头", "card", "标题样式"],
    fix: {
      file: "apps/web/src/styles/app.css",
      hint: ".ant-card .ant-card-head { min-height: 56px; padding: 12px 24px; } .ant-card-head-title { font-size: 16px; font-weight: 500; }",
    },
  },
];

/**
 * 差异表逐条匹配规则（仅字段级 diff；type=visual 的整页 diff 无文本特征，归 manual）。
 * @param {Array} differences visual:round 的 differences 数组
 * @param {Object} ctx 环境上下文（themeHasCellPadding / themeHasModalToken 等，供 check 用）
 * @returns {Array<{diff, ruleId, desc, fix}>} 命中的（diff + 规则信息），一条 diff 只归第一个命中规则
 */
export function matchFixRules(differences, ctx = {}) {
  const hits = [];
  for (const d of differences || []) {
    if (d.type === "visual") continue;
    for (const rule of FIX_RULES) {
      try {
        if (rule.check && !rule.check(ctx)) continue;
        const text = `${d.field || ""}${d.region || ""}${d.expected || ""}${d.actual || ""}${d.screen || ""}`.toLowerCase();
        if (rule.diffKeywords?.some((k) => text.includes(k.toLowerCase()))) {
          hits.push({ diff: d, ruleId: rule.id, desc: rule.desc, fix: rule.fix.hint });
          break;
        }
      } catch {
        // 规则自身异常不阻塞报告
      }
    }
  }
  return hits;
}

/**
 * 汇总：known（已知模式，带修法提示）/ manual（待人工）。
 * manual = 未命中规则的字段 diff + 全部视觉整页 diff（靠热力图人判）。
 */
export function summarizeFixes(differences, ctx = {}) {
  const all = differences || [];
  const hits = matchFixRules(all, ctx);
  const hitDiffSet = new Set(hits.map((h) => dKey(h.diff)));
  const known = hits.map(({ diff, ruleId, desc, fix }) => ({ ...diff, ruleId, ruleDesc: desc, fixHint: fix }));
  const manual = (all || []).filter((d) => d.type === "visual" || !hitDiffSet.has(dKey(d)));
  return { known, manual };
}

/** 差异对象标识：同屏同字段视为同一 diff */
function dKey(d) {
  return `${d.screen || ""}|${d.type || ""}|${d.field || d.region || ""}|${d.expected || ""}`;
}