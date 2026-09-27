/* Generated from Visual IR / Layout IR. Re-run: node scripts/generate-tokens-css.mjs */
export const color = {
  "primary": "#1890FF",
  "primaryHover": "#4BA8FF",
  "primarySoft": "#E6F4FF",
  "sidebarBg": "#FFFFFF",
  "sidebarText": "#8C8C8C",
  "sidebarActiveBg": "#E6F4FF",
  "sidebarActiveText": "#262626",
  "sidebarBrand": "#262626",
  "headerBg": "#FFFFFF",
  "pageBg": "#F5F7FA",
  "surface": "#FFFFFF",
  "text": "#1F2937",
  "textSecondary": "#595959",
  "border": "#E5E7EB",
  "success": "#52C41A",
  "warning": "#FA8C16",
  "danger": "#FF4D4F",
  "info": "#1890FF",
  "tableHead": "#FAFAFA"
} as const;

/** 图表：全部由 Layout IR 派生（系列色取具名 bar-*，轴/网格/刻度取同名节点） */
export const chart: { series: string[]; grid: string | null; axis: string | null; label: string | null } = {
  series: ["#1890FF","#69C0FF","#91D5FF","#BAE7FF","#E6F7FF"],
  grid: "#F0F0F0",
  axis: "#D9D9D9",
  label: "#000000",
};

export type Tone = { bg: string; fg: string | null };

/** 列表行内图标/头像调色板，按路由分组（同一原型文件里的等距方形组） */
export const tonePalette: Record<string, Tone[]> = {
  "/departments": [
    {
      "bg": "#EBF5FF",
      "fg": null
    },
    {
      "bg": "#FFF0F5",
      "fg": null
    },
    {
      "bg": "#FFF0F5",
      "fg": null
    },
    {
      "bg": "#E8FFF3",
      "fg": null
    },
    {
      "bg": "#F0E6FF",
      "fg": null
    }
  ],
  "/doctors": [
    {
      "bg": "#E6F7FF",
      "fg": "#1890FF"
    },
    {
      "bg": "#FFF0F5",
      "fg": "#D946A0"
    },
    {
      "bg": "#E8FFF3",
      "fg": "#22C55E"
    },
    {
      "bg": "#FFF5E6",
      "fg": "#F59E0B"
    }
  ]
};
