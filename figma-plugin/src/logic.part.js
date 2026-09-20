// ============================================================
// Emoji → Ant Icons 运行时逻辑（由 build.mjs 拼接进 code.js）
// 本文件不应直接在 Figma 中使用；数据(SVG_DATA)由 svgs.js 注入。
// ============================================================

const EMOJI_MAP = {
  // 第一轮：侧边栏/图表/导航类
  '🏠': 'HomeOutlined',
  '🏥': 'MedicineBoxOutlined',
  '🏷️': 'SkinOutlined',
  '👨‍⚕️': 'UserOutlined',
  '📅': 'CalendarOutlined',
  '📋': 'FileDoneOutlined',
  '👥': 'TeamOutlined',
  '💰': 'GoldOutlined',
  '⭐': 'StarOutlined',
  '📍': 'EnvironmentOutlined',
  '🖼️': 'PictureOutlined',
  '📢': 'NotificationOutlined',
  '📰': 'ReadOutlined',
  '🧭': 'AppstoreOutlined',
  '💬': 'CommentOutlined',
  '📏': 'HighlightOutlined',
  '🔔': 'BellOutlined',
  '⚙️': 'SettingOutlined',
  '📊': 'BarChartOutlined',
  '👤': 'UserOutlined',
  '🔐': 'SafetyCertificateOutlined',
  '📝': 'AuditOutlined',
  '📈': 'LineChartOutlined',
  '🥧': 'PieChartOutlined',
  '▶': 'RightOutlined',
  '＋': 'PlusOutlined',
  '✏️': 'EditOutlined',
  '✏': 'EditOutlined',
  '🗑️': 'DeleteOutlined',
  '🗑': 'DeleteOutlined',
  '✕': 'CloseOutlined',
  '🫁': 'MedicineBoxOutlined',
  '🧸': 'SmileOutlined',
  '🌸': 'CrownOutlined',
  '🦷': 'StopOutlined',
  '🩺': 'SkinOutlined',
  // 第二轮：操作按钮 / 弹窗类 emoji（2026-09-20 扫描原型残留 63 处）
  '📥': 'DownloadOutlined',
  '🔑': 'KeyOutlined',
  '☁️': 'CloudUploadOutlined',
  '☁': 'CloudUploadOutlined',
  '📶': 'WifiOutlined',
  '♥': 'HeartOutlined',
  '❤': 'HeartOutlined',
  '⚠️': 'WarningOutlined',
  '⚠': 'WarningOutlined',
  '✄': 'ScissorOutlined',
  '🔗': 'LinkOutlined',
  '☑': 'CheckSquareOutlined',
  '☰': 'MenuOutlined',
  '🎥': 'VideoCameraOutlined',
  '↶': 'UndoOutlined',
  '↷': 'RedoOutlined',
  '⛶': 'ExpandOutlined',
  '🔍': 'SearchOutlined',
  '✎': 'EditOutlined',
  '👁': 'EyeOutlined',
  '🙈': 'EyeInvisibleOutlined',
  '❝': 'ReadOutlined',
  '☺': 'SmileOutlined',
  // 第三轮：患者管理 🔖/🔓（2026-09-20 重扫残留）
  '🔖': 'TagOutlined',
  '🔓': 'UnlockOutlined',
  '💾': 'SaveOutlined',
};

// 归一化映射表（去掉 VS16 变体选择符，兼容 ⭐/⭐️ 两种形态）
const EMOJI_ENTRIES = Object.entries(EMOJI_MAP).map(([k, v]) => [k.replace(/\uFE0F/g, ''), v]);

const MIN_SIZE = 12;
const MAX_SIZE = 24;

function notify(msg) {
  figma.notify(msg, { timeout: 4000 });
}

/** 递归收集节点树中的 TEXT 图层 */
function collectTextNodes(nodes, out) {
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === 'TEXT') {
      out.push(node);
    } else if ('children' in node && Array.isArray(node.children)) {
      collectTextNodes(node.children, out);
    }
  }
  return out;
}

/** 把 asn JSON 数据渲染成完整 SVG 字符串 */
function buildSvgString(name, size) {
  const entry = SVG_DATA[name];
  if (!entry || !entry.icon) return null;
  function render(node) {
    const attrs = Object.entries(node.attrs || {})
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const children = (node.children || []).map(render).join('');
    if (node.tag === 'svg') {
      return `<svg ${attrs} width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${children}</svg>`;
    }
    return `<${node.tag} ${attrs}>${children}</${node.tag}>`;
  }
  return render(entry.icon);
}

/** 把图标所有矢量子节点染成单色（antd 图标为填充路径） */
function tintIcon(frame, color) {
  const vectors = frame.findAll((n) => n.type === 'VECTOR');
  for (const v of vectors) {
    v.fills = [{ type: 'SOLID', color }];
    v.strokes = [];
  }
}

/** 找出文本中全部 emoji 命中（绝对下标；同位置优先最长 key） */
function findAllEmoji(chars) {
  const out = [];
  let from = 0;
  for (;;) {
    let best = null;
    for (const [key, name] of EMOJI_ENTRIES) {
      const i = chars.indexOf(key, from);
      if (i < 0) continue;
      if (!best || i < best.i || (i === best.i && key.length > best.len)) {
        best = { key, name, i, len: key.length };
      }
    }
    if (!best) break;
    out.push(best);
    from = best.i + best.len;
  }
  return out;
}

/** 修改文字前必须加载节点用到的所有字体 */
async function loadFontsFor(textNode) {
  // 显式硬加载原型使用的字体（错误日志证实为 Noto Sans SC）
  const targets = [
    { family: 'Noto Sans SC', style: 'Regular' },
    { family: 'Noto Sans SC', style: 'Medium' },
    { family: 'Inter', style: 'Regular' },
  ];
  try {
    const fn = textNode.fontName;
    if (fn && typeof fn === 'object' && fn.family) targets.unshift(fn);
  } catch (e) {
    /* mixed fonts 时 fontName 读取可能抛错，忽略 */
  }
  try {
    const fonts = textNode.getRangeAllFonts(0, Math.max(1, textNode.characters.length)) || [];
    for (const f of fonts) {
      if (f && f.fontName && f.fontName.family) targets.push(f.fontName);
    }
  } catch (e) {
    /* getRangeAllFonts 不可用时忽略 */
  }
  const seen = new Set();
  for (const fn of targets) {
    if (!fn || !fn.family) continue;
    const key = `${fn.family}/${fn.style}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await figma.loadFontAsync(fn);
    } catch (e) {
      /* 单个字体不可用继续尝试下一个 */
    }
  }
}

/** 汇总错误信息（main 结束时上报） */
const ERRORS = [];

/** 按规格生成一个染色图标 frame（失败返回 null） */
function makeIcon(name, size, color) {
  const svg = buildSvgString(name, size);
  if (!svg) return null;
  const frame = figma.createNodeFromSvg(svg);
  frame.name = name;
  tintIcon(frame, color);
  return frame;
}

async function replaceEmojiInText(textNode) {
  const raw = textNode.characters.replace(/\uFE0F/g, '');
  const hits = findAllEmoji(raw);
  if (hits.length === 0) return null;

  // 图标尺寸取字号（而非行盒高度），并钳到偶数：避免非整数缩放导致的抗锯齿发虚
  // fontSize 在混合字号文本上返回 figma.mixed（非数字），需兜底
  const rawFont = typeof textNode.fontSize === 'number' ? textNode.fontSize : null;
  const rawSize = Math.round(rawFont ?? Math.min(textNode.height || 16, 20));
  const size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, rawSize - (rawSize % 2)));

  // 颜色沿用文本图层填充
  let color = { r: 0.35, g: 0.35, b: 0.35 };
  const fill = textNode.fills;
  if (Array.isArray(fill) && fill[0] && fill[0].type === 'SOLID') {
    color = { ...fill[0].color };
  }

  const parent = textNode.parent;
  if (!parent) return null;
  const insertAt = parent.children.indexOf(textNode);

  // 先快照几何信息（改写/删除后不可靠）
  const textX = Math.round(textNode.x);
  const textY = Math.round(textNode.y);
  const textH = textNode.height || size;

  const first = hits[0];
  // 去掉全部 emoji 后的剩余文字
  let rest = raw;
  for (const h of [...hits].reverse()) {
    rest = rest.slice(0, h.i) + rest.slice(h.i + h.len);
  }
  rest = rest.trim();

  if (rest.length === 0) {
    // 纯图标图层（如 ⭐⭐⭐ / 🏠）：整层替换，多图标按原顺序水平排布
    textNode.remove();
    let cursor = textX;
    let made = 0;
    for (const h of hits) {
      const frame = makeIcon(h.name, size, color);
      if (!frame) continue;
      frame.x = cursor;
      frame.y = textY + Math.max(0, Math.round((textH - frame.height) / 2));
      parent.insertChild(insertAt, frame);
      cursor += frame.width + 2;
      made++;
    }
    if (made === 0) return null;
    return { emoji: first.key, name: first.name, count: made };
  }

  // 混合图层：文字剥掉全部 emoji，图标按原顺序插到文字左侧
  await loadFontsFor(textNode);
  let rewritten = false;
  try {
    textNode.characters = rest;
    rewritten = true;
  } catch (e) {
    // 兜底 1：切 Inter Regular 重试（切字体本身也需要字体已加载）
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      textNode.fontName = { family: 'Inter', style: 'Regular' };
      textNode.characters = rest;
      rewritten = true;
    } catch (e2) {
      ERRORS.push(`${first.key}: 无法改写文字 (${e.message || e})`);
    }
  }
  if (!rewritten) {
    // 兜底 2：改不动文字就保留原文字，只把第一个图标插到 emoji 左侧（不丢内容，可手动删 emoji）
    const frame = makeIcon(first.name, size, color);
    if (!frame) return null;
    frame.x = textX - frame.width - 4;
    frame.y = textY + Math.max(0, Math.round((textH - frame.height) / 2));
    parent.insertChild(insertAt, frame);
    return { emoji: first.key, name: first.name, count: 1, keptText: true };
  }

  // 文字已剥掉 emoji；图标插到文字左侧（多图标按原顺序水平排布）
  let cursor = textX;
  let made = 0;
  for (const h of hits) {
    const frame = makeIcon(h.name, size, color);
    if (!frame) continue;
    frame.x = cursor;
    frame.y = textY + Math.max(0, Math.round((textH - frame.height) / 2));
    parent.insertChild(insertAt, frame);
    cursor += frame.width + 2;
    made++;
  }
  if (made > 0) {
    textNode.x = cursor + 4;
  }
  if (made === 0) return null;
  return { emoji: first.key, name: first.name, count: made };
}

async function replaceInNodes(nodes) {
  const texts = collectTextNodes(nodes, []);
  let count = 0;
  const summary = {};
  for (const t of texts) {
    if (!t.parent) continue; // 可能已被前一步删除
    try {
      const hit = await replaceEmojiInText(t);
      if (hit) {
        count += hit.count || 1;
        summary[hit.emoji] = (summary[hit.emoji] || 0) + (hit.count || 1);
      }
    } catch (e) {
      // 单个节点失败不中断整体，但记录原因
      ERRORS.push(`${t.characters.slice(0, 8)}: ${e.message || e}`);
    }
  }
  return { count, summary };
}

async function runEmojiCommand() {
  if (!SVG_DATA || Object.keys(SVG_DATA).length === 0) {
    notify('❌ SVG 数据为空（重新构建 code.js）');
    figma.closePlugin();
    return;
  }
  const selection = figma.currentPage.selection;
  const nodes = selection.length > 0 ? selection : figma.currentPage.children;
  const result = await replaceInNodes(nodes);
  const detail = Object.entries(result.summary)
    .map(([e, n]) => `${e}×${n}`)
    .join('  ');
  notify(`✅ 替换了 ${result.count} 个 emoji${detail ? '：' + detail : ''}`);
  if (ERRORS.length) {
    // 失败详情（控制台可查：Plugins → Development → Open Console）
    console.error('[emoji-to-ant] 失败明细:', ERRORS.join(' | '));
    notify(`⚠️ ${ERRORS.length} 个未替换，详情见控制台`);
  }
  figma.closePlugin();
}