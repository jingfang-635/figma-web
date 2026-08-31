import { existsSync, readFileSync } from "node:fs";

export function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function parseFileKey(input) {
  const trimmed = String(input || "").trim();
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (m?.[1]) return m[1];
  throw new Error("Invalid Figma URL or fileKey");
}

export function rgbToHex(color) {
  if (!color) return null;
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function walk(node, visit, depth = 0) {
  if (!node) return;
  visit(node, depth);
  for (const child of node.children || []) walk(child, visit, depth + 1);
}

export function solidFillHex(node) {
  const fills = node.fills;
  if (!Array.isArray(fills)) return null;
  const solid = fills.find((f) => f.type === "SOLID" && f.visible !== false);
  if (!solid?.color) return null;
  const hex = rgbToHex(solid.color);
  if (solid.opacity != null && solid.opacity < 1 && hex) {
    const a = Math.round(solid.opacity * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
    return hex + a;
  }
  return hex;
}
