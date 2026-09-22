import { rgbToHex, solidFillHex } from "./env.mjs";

const LEAF_TYPES = new Set([
  "VECTOR",
  "BOOLEAN_OPERATION",
  "STAR",
  "LINE",
  "REGULAR_POLYGON",
  "ELLIPSE",
]);

function round(n) {
  return Math.round(Number(n) || 0);
}

function strokeHex(node) {
  const strokes = node.strokes;
  if (!Array.isArray(strokes)) return null;
  const solid = strokes.find((s) => s.type === "SOLID" && s.visible !== false);
  if (!solid?.color) return null;
  return rgbToHex(solid.color);
}

function textColor(node) {
  return solidFillHex(node);
}

export function simplifyNode(node, depth = 0) {
  if (!node || node.visible === false) return null;
  const box = node.absoluteBoundingBox;
  const out = {
    id: node.id,
    name: node.name || "",
    type: node.type,
  };
  if (box) {
    out.box = {
      x: round(box.x),
      y: round(box.y),
      w: round(box.width),
      h: round(box.height),
    };
  }
  if (node.layoutMode && node.layoutMode !== "NONE") {
    out.layout = {
      mode: node.layoutMode,
      gap: node.itemSpacing ?? 0,
      pad: [
        round(node.paddingTop || 0),
        round(node.paddingRight || 0),
        round(node.paddingBottom || 0),
        round(node.paddingLeft || 0),
      ],
      primary: node.primaryAxisAlignItems || undefined,
      counter: node.counterAxisAlignItems || undefined,
    };
  }
  const fill = solidFillHex(node);
  if (fill) out.fill = fill;
  const stroke = strokeHex(node);
  if (stroke) out.stroke = stroke;
  if (node.cornerRadius != null && node.cornerRadius !== 0) {
    out.radius = round(node.cornerRadius);
  }
  if (node.type === "TEXT" && node.characters) {
    out.text = node.characters;
    const s = node.style || {};
    out.font = {
      family: s.fontFamily,
      size: s.fontSize,
      weight: s.fontWeight,
      lineHeight: s.lineHeightPx ?? s.lineHeightPercentFontSize,
      letterSpacing: s.letterSpacing,
      color: textColor(node),
    };
  }
  const imageFill = Array.isArray(node.fills)
    ? node.fills.find((f) => f.type === "IMAGE" && f.visible !== false)
    : null;
  if (imageFill) out.imageRef = imageFill.imageRef || true;

  if (Array.isArray(node.effects) && node.effects.length) {
    const drop = node.effects.find((e) => e.type === "DROP_SHADOW" && e.visible !== false);
    if (drop) {
      out.shadow = {
        r: round(drop.radius || 0),
        x: round(drop.offset?.x || 0),
        y: round(drop.offset?.y || 0),
      };
    }
  }

  if (LEAF_TYPES.has(node.type) || depth > 14) return out;
  const kids = [];
  for (const child of node.children || []) {
    const s = simplifyNode(child, depth + 1);
    if (s) kids.push(s);
  }
  if (kids.length) out.children = kids;
  return out;
}

export function walkLayout(node, visit, parent = null) {
  if (!node) return;
  visit(node, parent);
  for (const child of node.children || []) walkLayout(child, visit, node);
}

export function collectByType(root) {
  const texts = [];
  const graphics = [];
  const frames = [];
  walkLayout(root, (n) => {
    if (n.text && n.box) texts.push(n);
    if (n.box && (n.imageRef || n.type === "INSTANCE" || n.type === "COMPONENT" || n.type === "BOOLEAN_OPERATION" || n.type === "VECTOR")) {
      const max = Math.max(n.box.w, n.box.h);
      const min = Math.min(n.box.w, n.box.h);
      if (max <= 64 && min >= 8) graphics.push(n);
    }
    if (n.box && (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE" || n.type === "GROUP")) {
      frames.push(n);
    }
  });
  return { texts, graphics, frames };
}

function nearestLeftGraphic(text, graphics) {
  let best = null;
  let bestScore = Infinity;
  for (const g of graphics) {
    if (g.box.x >= text.box.x) continue;
    const dy = Math.abs(g.box.y + g.box.h / 2 - (text.box.y + text.box.h / 2));
    const dx = text.box.x - (g.box.x + g.box.w);
    if (dy > 18 || dx > 40 || dx < -4) continue;
    const score = dy + dx;
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

/**
 * 图标关联（文本驱动，跨项目通用）：
 * 对所有短文本（≤12 字符，视为导航/列表 label）尝试关联其左侧最近的图形节点。
 * 不再依赖预置的 NAV_LABELS / DEPT_LABELS 业务列表。
 */
export function associateIcons(root) {
  const { texts, graphics } = collectByType(root);
  const icons = {};
  for (const t of texts) {
    const label = t.text.trim();
    if (!label || label.length > 12) continue;
    if (icons[label]) continue;
    const g = nearestLeftGraphic(t, graphics);
    if (g) icons[label] = { nodeId: g.id, w: g.box.w, h: g.box.h, name: g.name };
  }
  return { nav: icons, depts: {} };
}

function luminance(hex) {
  if (!hex || hex.length < 7) return 0;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (r + g + b) / 3;
}

function isNearWhite(hex) {
  return luminance(hex) > 245;
}

function isLinkBlue(hex) {
  if (!hex || hex.length < 7) return false;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return b > r + 30 && b > 140;
}

/** Deterministic lighten toward white; only used to derive a hover shade from a named-node color. */
function lightenHex(hex, ratio) {
  if (!hex || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const mix = (v) => Math.round(v + (255 - v) * ratio);
  const r = mix((n >> 16) & 255),
    g = mix((n >> 8) & 255),
    b = mix(n & 255);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function findAncestorWithFill(node, parentMap) {
  let cur = parentMap.get(node);
  while (cur) {
    if (cur.fill && !isNearWhite(cur.fill) && cur.box && cur.box.h <= 56 && cur.box.h >= 28) {
      return cur;
    }
    cur = parentMap.get(cur);
  }
  return null;
}

function parentMapOf(root) {
  const map = new Map();
  walkLayout(root, (n, p) => {
    if (p) map.set(n, p);
  });
  return map;
}

export function tokensFromNamedNodes(sidebar, pages) {
  const tokens = {
    color: {
      primary: "#1677FF",
      primaryHover: "#4096FF",
      primarySoft: "#E6F4FF",
      sidebarBg: "#FFFFFF",
      sidebarText: "#4B5563",
      sidebarActiveBg: "#E6F4FF",
      sidebarActiveText: "#1677FF",
      sidebarBrand: "#1F2937",
      headerBg: "#FFFFFF",
      pageBg: "#F0F2F5",
      surface: "#FFFFFF",
      text: "#1F2937",
      textSecondary: "#6B7280",
      border: "#E5E7EB",
      success: "#52C41A",
      warning: "#FA8C16",
      danger: "#FF4D4F",
      info: "#1677FF",
      tableHead: "#FAFAFA",
    },
    font: {
      family: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      size: { xs: "12px", sm: "13px", md: "14px", lg: "16px", xl: "20px", xxl: "24px" },
    },
    space: { page: 24, gap: 16, header: 56, sidebar: 220, kpiHeight: 88, navIcon: 16, navIconGap: 13, navIconGapSub: 14 },
    radius: { sm: 4, md: 8, lg: 12 },
    shadow: { card: "0 1px 2px rgba(0,0,0,0.06)", modal: "0 12px 40px rgba(0,0,0,0.18)" },
  };

  if (sidebar) {
    if (sidebar.fill) tokens.color.sidebarBg = sidebar.fill.slice(0, 7);
    if (sidebar.box) tokens.space.sidebar = sidebar.box.w;
    const { texts } = collectByType(sidebar);
    const parents = parentMapOf(sidebar);
    // 激活项 = 侧栏中带彩色填充祖先的第一个短文本项（不再写死「首页」）
    const navItems = texts.filter((t) => t.text.trim().length > 0 && t.text.trim().length <= 12);
    const firstActive = navItems.find((t) => {
      const item = findAncestorWithFill(t, parents);
      return item?.fill && !isNearWhite(item.fill);
    });
    const first = firstActive || navItems[0];
    if (first) {
      if (first.font?.color) tokens.color.sidebarActiveText = first.font.color.slice(0, 7);
      const item = findAncestorWithFill(first, parents);
      if (item?.fill) tokens.color.sidebarActiveBg = item.fill.slice(0, 7);
      if (item?.box) tokens.space.navItemHeight = item.box.h;
    }
    const other = navItems.find((t) => t !== first);
    if (other?.font?.color) tokens.color.sidebarText = other.font.color.slice(0, 7);
    // 品牌色 = 侧栏中字号最大的文本
    const brand = [...navItems].sort((a, b) => (b.font?.size || 0) - (a.font?.size || 0))[0];
    if (brand?.font?.color) tokens.color.sidebarBrand = brand.font.color.slice(0, 7);
    if (brand?.font?.family) {
      tokens.font.family = `"${brand.font.family}", "PingFang SC", "Microsoft YaHei", sans-serif`;
    }
    const firstIcon = first ? associateIcons(sidebar).nav[first.text.trim()] : null;
    if (firstIcon) tokens.space.navIcon = Math.max(firstIcon.w, firstIcon.h);
  }

  for (const page of pages || []) {
    if (!page) continue;
    const { texts, frames } = collectByType(page);
    if (page.fill && luminance(page.fill) > 220 && luminance(page.fill) < 250) {
      tokens.color.pageBg = page.fill.slice(0, 7);
    }
    const gray = frames.find(
      (f) => f.fill && luminance(f.fill) > 230 && luminance(f.fill) < 248 && f.box && f.box.w > 800,
    );
    if (gray?.fill) tokens.color.pageBg = gray.fill.slice(0, 7);

    const title = texts.find((t) => t.font?.size >= 18 && t.font?.weight >= 600);

    // Brand primary comes from a named node — the page-title text, which the prototype
    // paints with the accent blue — never from an area heuristic or the antd default.
    const accentText =
      texts.find((t) => t.text.trim() === page.name && isLinkBlue(t.font?.color)) ||
      texts.find((t) => isLinkBlue(t.font?.color));
    if (accentText?.font?.color) {
      const c = accentText.font.color.slice(0, 7);
      tokens.color.primary = c;
      tokens.color.info = c;
      tokens.color.primaryHover = lightenHex(c, 0.22);
      if (accentText.text.trim() === page.name) tokens.color.primarySoft = tokens.color.sidebarActiveBg;
    }

    if (title?.font?.color) {
      const c = title.font.color.slice(0, 7);
      if (!isLinkBlue(c)) tokens.color.text = c;
    }
    if (title?.font?.size) tokens.font.size.xl = `${Math.round(title.font.size)}px`;

    const sub = texts.find((t) => t.font?.size && t.font.size <= 13 && t.font.size >= 12 && t.text.length > 8);
    if (sub?.font?.color) tokens.color.textSecondary = sub.font.color.slice(0, 7);

    const primaryBtn = frames.find((f) => {
      if (!f.fill || !f.box) return false;
      const l = luminance(f.fill);
      return f.box.w >= 64 && f.box.w <= 180 && f.box.h >= 28 && f.box.h <= 44 && l < 180 && l > 40;
    });
    if (primaryBtn?.fill) {
      tokens.color.primary = primaryBtn.fill.slice(0, 7);
      tokens.color.info = tokens.color.primary;
    }

    const kpi = frames.find((f) => f.box && f.box.w >= 200 && f.box.w <= 320 && f.box.h >= 70 && f.box.h <= 120 && f.fill && isNearWhite(f.fill));
    if (kpi?.box) {
      tokens.space.kpiHeight = kpi.box.h;
      if (kpi.layout?.gap) tokens.space.gap = kpi.layout.gap;
      if (kpi.radius) tokens.radius.md = kpi.radius;
    }

    const header = frames.find((f) => f.box && f.box.w > 900 && f.box.h >= 48 && f.box.h <= 72 && f.box.y <= (page.box?.y || 0) + 8);
    if (header?.box) {
      tokens.space.header = header.box.h;
      if (header.fill) tokens.color.headerBg = header.fill.slice(0, 7);
    }

    if (page.layout?.pad?.[1]) tokens.space.page = page.layout.pad[1] || page.layout.pad[0] || tokens.space.page;
  }

  return tokens;
}

/** 通用区域推断（不再按 home/departments/organization/schedules 特判） */
export function inferRegions(id, root) {
  const { texts, frames } = collectByType(root);
  const regions = [];
  const titleNode = texts.find((t) => t.text.trim() === root.name || (t.font?.size >= 18 && t.font?.weight >= 600));
  if (titleNode) {
    regions.push({
      id: "pageHeader",
      nodeId: titleNode.id,
      name: titleNode.text.trim(),
      box: titleNode.box,
      font: { title: titleNode.font?.size, weight: titleNode.font?.weight, color: titleNode.font?.color },
    });
  }
  const kpiCandidates = frames.filter(
    (f) => f.box && f.box.w >= 180 && f.box.w <= 340 && f.box.h >= 64 && f.box.h <= 130,
  );
  if (kpiCandidates.length >= 3) {
    const first = kpiCandidates[0];
    regions.push({
      id: "kpiRow",
      nodeId: first.id,
      box: first.box,
      gap: first.layout?.gap ?? 12,
      padding: first.layout?.pad,
      fill: first.fill,
      height: first.box.h,
    });
  }
  // 主内容卡 = 页面内最大的浅色 frame
  const mainCard = frames
    .filter((f) => f.fill && isNearWhite(f.fill) && f.box && f.box.w > 400 && f.box.h > 200)
    .sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0];
  if (mainCard) {
    regions.push({ id: "mainCard", nodeId: mainCard.id, box: mainCard.box, fill: mainCard.fill });
  }
  return regions;
}

export function collectExportables(id, root, icons) {
  const out = [];
  if (icons?.nav) {
    for (const [label, info] of Object.entries(icons.nav)) {
      out.push({ nodeId: info.nodeId, name: info.name, kind: "nav", label, w: info.w, h: info.h });
    }
  }
  if (icons?.depts) {
    for (const [label, info] of Object.entries(icons.depts)) {
      out.push({ nodeId: info.nodeId, name: info.name, kind: "dept", label, w: info.w, h: info.h });
    }
  }
  if (id === "sidebar") {
    walkLayout(root, (n) => {
      if (!n.box) return;
      if ((n.imageRef || n.type === "INSTANCE") && n.box.w >= 24 && n.box.w <= 48 && n.box.h >= 24 && n.box.h <= 48 && n.box.y <= (root.box?.y || 0) + 80) {
        out.push({ nodeId: n.id, name: n.name, kind: "brand", label: "brand", w: n.box.w, h: n.box.h });
      }
    });
  }
  return out;
}

export function collectTexts(root, limit = 80) {
  const texts = [];
  walkLayout(root, (n) => {
    if (n.text) texts.push(n.text.trim());
  });
  return texts.filter(Boolean).slice(0, limit);
}